from functools import wraps
from typing import Callable, TypeVar

from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.middleware.csrf import get_token
from django.utils.translation import gettext_lazy as _
from ninja import Router, Schema
from ninja.utils import check_csrf

from .models import User
from .phone_utils import normalize_phone

router = Router()
T = TypeVar("T")


class LoginIn(Schema):
    identifier: str
    password: str


class RegisterIn(Schema):
    username: str
    phone: str
    arabic_full_name: str
    password: str
    account_type: User.AccountType
    allow_whatsapp: bool = True
    whatsapp_number: str = ""
    allow_call: bool = True
    call_phone: str = ""
    locality_id: int | None = None
    bio: str = ""


class ProfileUpdateIn(Schema):
    arabic_full_name: str | None = None
    allow_whatsapp: bool | None = None
    whatsapp_number: str | None = None
    allow_call: bool | None = None
    call_phone: str | None = None
    locality_id: int | None = None
    bio: str | None = None


class UserOut(Schema):
    id: int
    username: str
    phone: str
    arabic_full_name: str
    is_superuser: bool
    account_type: User.AccountType
    allow_whatsapp: bool
    whatsapp_number: str
    allow_call: bool
    call_phone: str
    locality_id: int | None = None
    locality_name_ar: str | None = None
    state_name_ar: str | None = None
    bio: str

    @staticmethod
    def resolve_locality_name_ar(obj: User) -> str | None:
        return obj.locality.name_ar if obj.locality else None

    @staticmethod
    def resolve_state_name_ar(obj: User) -> str | None:
        return obj.locality.state.name_ar if obj.locality else None


class DirectoryAccountOut(Schema):
    id: int
    username: str
    arabic_full_name: str
    account_type: User.AccountType
    allow_whatsapp: bool
    whatsapp_number: str
    allow_call: bool
    call_phone: str
    locality_id: int | None = None
    locality_name_ar: str | None = None
    state_name_ar: str | None = None
    bio: str

    @staticmethod
    def resolve_locality_name_ar(obj: User) -> str | None:
        return obj.locality.name_ar if obj.locality else None

    @staticmethod
    def resolve_state_name_ar(obj: User) -> str | None:
        return obj.locality.state.name_ar if obj.locality else None


class AvailabilityOut(Schema):
    username_taken: bool
    phone_taken: bool


class MessageOut(Schema):
    detail: str


class CsrfOut(Schema):
    token: str


def csrf_protected(view: Callable[..., T]) -> Callable[..., T]:
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        failure = check_csrf(request, view)
        if failure is not None:
            return failure
        return view(request, *args, **kwargs)

    return wrapped


@router.get("/csrf", response=CsrfOut)
def csrf_token(request):
    return {"token": get_token(request)}


@router.get("/check-availability", response=AvailabilityOut)
def check_availability(request, username: str = "", phone: str = ""):
    """
    Check whether a username or phone number is already registered.
    Returns booleans — no sensitive data exposed.
    """
    normalised_phone = normalize_phone(phone) if phone.strip() else ""
    return {
        "username_taken": bool(username.strip()) and User.objects.filter(username=username.strip()).exists(),
        "phone_taken": bool(normalised_phone) and User.objects.filter(phone=normalised_phone).exists(),
    }


@router.post(
    "/login",
    response={200: UserOut, 401: MessageOut},
)
@csrf_protected
def login_view(request, payload: LoginIn):
    user = authenticate(
        request,
        identifier=payload.identifier,
        password=payload.password,
    )
    if user is None:
        return 401, {"detail": str(_("Invalid phone number or password."))}
    login(request, user)
    return user


@router.post(
    "/register",
    response={201: UserOut, 400: MessageOut},
)
@csrf_protected
def register_view(request, payload: RegisterIn):
    if not payload.allow_whatsapp and not payload.allow_call:
        return 400, {"detail": str(_("Please enable at least one contact method (WhatsApp or phone call)."))}

    canonical_phone = normalize_phone(payload.phone)
    whatsapp_number = normalize_phone(payload.whatsapp_number) if payload.whatsapp_number.strip() else (canonical_phone if payload.allow_whatsapp else "")
    call_phone = normalize_phone(payload.call_phone) if payload.call_phone.strip() else (canonical_phone if payload.allow_call else "")

    try:
        user = User.objects.create_user(
            username=payload.username.strip(),
            phone=canonical_phone,
            password=payload.password,
            arabic_full_name=payload.arabic_full_name.strip(),
            account_type=payload.account_type,
            allow_whatsapp=payload.allow_whatsapp,
            whatsapp_number=whatsapp_number,
            allow_call=payload.allow_call,
            call_phone=call_phone,
            locality_id=payload.locality_id,
            bio=payload.bio.strip(),
        )
    except (IntegrityError, ValueError) as error:
        return 400, {"detail": str(error)}

    login(request, user, backend="accounts.backends.UsernameOrPhoneBackend")
    return 201, user


@router.put(
    "/profile",
    response={200: UserOut, 400: MessageOut, 401: MessageOut},
)
@csrf_protected
def update_profile_view(request, payload: ProfileUpdateIn):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    user: User = request.user
    next_allow_whatsapp = payload.allow_whatsapp if payload.allow_whatsapp is not None else user.allow_whatsapp
    next_allow_call = payload.allow_call if payload.allow_call is not None else user.allow_call
    if not next_allow_whatsapp and not next_allow_call:
        return 400, {"detail": str(_("Please enable at least one contact method (WhatsApp or phone call)."))}

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)

    if user.allow_whatsapp and not user.whatsapp_number:
        user.whatsapp_number = user.phone
    if user.allow_call and not user.call_phone:
        user.call_phone = user.phone

    user.save()
    return user


@router.post("/logout", response={200: MessageOut})
@csrf_protected
def logout_view(request):
    logout(request)
    return {"detail": str(_("You have been logged out."))}


@router.get("/me", response=UserOut | None)
def current_user(request):
    if not request.user.is_authenticated:
        return None
    return request.user


@router.get(
    "/directory",
    response={200: list[DirectoryAccountOut], 401: MessageOut},
)
def directory_view(request, account_type: User.AccountType | None = None):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    queryset = User.objects.select_related("locality__state").filter(is_active=True, is_superuser=False)
    if account_type is not None:
        queryset = queryset.filter(account_type=account_type)
    return queryset.order_by("account_type", "arabic_full_name")
