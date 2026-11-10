from functools import wraps
from typing import Callable, TypeVar

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.translation import gettext_lazy as _
from ninja import Router, Schema
from ninja.utils import check_csrf

from .models import User

router = Router()
T = TypeVar("T")


class LoginIn(Schema):
    identifier: str
    password: str


class UserOut(Schema):
    id: int
    username: str
    phone: str
    arabic_full_name: str
    is_superuser: bool


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
