from datetime import datetime, timedelta
from decimal import Decimal
from functools import wraps
from typing import Callable, TypeVar

from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from ninja import Router, Schema
from ninja.utils import check_csrf

from accounts.models import User

from .models import DEFAULT_EXPIRY_DAYS, MAX_EXPIRY_DAYS, Listing

router = Router()
T = TypeVar("T")


# ── Schemas ───────────────────────────────────────────────────────────────────

class MessageOut(Schema):
    detail: str


class ListingIn(Schema):
    listing_type: Listing.ListingType
    product_category: Listing.ProductCategory
    product_name: str
    price: Decimal
    quantity: Decimal
    unit: Listing.Unit
    description: str = ""
    duration_days: int = DEFAULT_EXPIRY_DAYS


class RenewListingIn(Schema):
    duration_days: int = DEFAULT_EXPIRY_DAYS


class ListingUpdateIn(Schema):
    listing_type: Listing.ListingType | None = None
    product_category: Listing.ProductCategory | None = None
    product_name: str | None = None
    price: Decimal | None = None
    quantity: Decimal | None = None
    unit: Listing.Unit | None = None
    description: str | None = None


class ListingOut(Schema):
    id: int
    listing_type: Listing.ListingType
    product_category: Listing.ProductCategory
    product_name: str
    price: Decimal
    quantity: Decimal
    unit: Listing.Unit
    description: str
    created_at: datetime
    expires_at: datetime
    is_active: bool
    author_id: int
    author_name: str
    author_account_type: str
    author_locality_name_ar: str | None = None
    author_state_name_ar: str | None = None
    author_allow_whatsapp: bool
    author_whatsapp_number: str
    author_allow_call: bool
    author_call_phone: str

    @staticmethod
    def resolve_author_name(obj: Listing) -> str:
        return obj.author.arabic_full_name

    @staticmethod
    def resolve_author_account_type(obj: Listing) -> str:
        return obj.author.account_type

    @staticmethod
    def resolve_author_locality_name_ar(obj: Listing) -> str | None:
        return obj.author.locality.name_ar if obj.author.locality else None

    @staticmethod
    def resolve_author_state_name_ar(obj: Listing) -> str | None:
        return obj.author.locality.state.name_ar if obj.author.locality else None

    @staticmethod
    def resolve_author_allow_whatsapp(obj: Listing) -> bool:
        return obj.author.allow_whatsapp

    @staticmethod
    def resolve_author_whatsapp_number(obj: Listing) -> str:
        return obj.author.whatsapp_number

    @staticmethod
    def resolve_author_allow_call(obj: Listing) -> bool:
        return obj.author.allow_call

    @staticmethod
    def resolve_author_call_phone(obj: Listing) -> str:
        return obj.author.call_phone


# ── CSRF helper ───────────────────────────────────────────────────────────────

def csrf_protected(view: Callable[..., T]) -> Callable[..., T]:
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        failure = check_csrf(request, view)
        if failure is not None:
            return failure
        return view(request, *args, **kwargs)
    return wrapped


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response={200: list[ListingOut], 401: MessageOut})
def list_listings(
    request,
    listing_type: Listing.ListingType | None = None,
    product_category: Listing.ProductCategory | None = None,
    author_account_type: User.AccountType | None = None,
    my_listings: bool = False,
):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    now = timezone.now()
    # Mark expired listings inactive so their status stays accurate.
    Listing.objects.filter(is_active=True, expires_at__lte=now).update(is_active=False)

    qs = Listing.objects.select_related("author__locality__state")
    if my_listings:
        qs = qs.filter(author=request.user)
    else:
        qs = qs.filter(is_active=True, expires_at__gt=now)
        if author_account_type is not None:
            qs = qs.filter(author__account_type=author_account_type)

    if listing_type is not None:
        qs = qs.filter(listing_type=listing_type)
    if product_category is not None:
        qs = qs.filter(product_category=product_category)
    return list(qs.order_by("-created_at"))


@router.post("", response={201: ListingOut, 400: MessageOut, 401: MessageOut})
@csrf_protected
def create_listing(request, payload: ListingIn):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    duration = max(1, min(MAX_EXPIRY_DAYS, payload.duration_days))
    expires_at = timezone.now() + timedelta(days=duration)

    listing = Listing.objects.create(
        author=request.user,
        listing_type=payload.listing_type,
        product_category=payload.product_category,
        product_name=payload.product_name.strip(),
        price=payload.price,
        quantity=payload.quantity,
        unit=payload.unit,
        description=payload.description.strip(),
        expires_at=expires_at,
    )
    # Refresh author relation for resolvers
    listing = Listing.objects.select_related("author__locality__state").get(pk=listing.pk)
    return 201, listing


@router.delete("/{listing_id}", response={200: MessageOut, 401: MessageOut, 403: MessageOut, 404: MessageOut})
@csrf_protected
def delete_listing(request, listing_id: int):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    try:
        listing = Listing.objects.get(pk=listing_id)
    except Listing.DoesNotExist:
        return 404, {"detail": str(_("Listing not found."))}

    if listing.author_id != request.user.pk and not request.user.is_superuser:
        return 403, {"detail": str(_("You can only delete your own listings."))}

    listing.delete()
    return {"detail": str(_("Listing deleted."))}


@router.post("/{listing_id}/renew", response={200: ListingOut, 401: MessageOut, 403: MessageOut, 404: MessageOut})
@csrf_protected
def renew_listing(request, listing_id: int, payload: RenewListingIn | None = None):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    try:
        listing = Listing.objects.select_related("author__locality__state").get(pk=listing_id)
    except Listing.DoesNotExist:
        return 404, {"detail": str(_("Listing not found."))}

    if listing.author_id != request.user.pk and not request.user.is_superuser:
        return 403, {"detail": str(_("You can only renew your own listings."))}

    requested_days = payload.duration_days if payload is not None else DEFAULT_EXPIRY_DAYS
    duration = max(1, min(MAX_EXPIRY_DAYS, requested_days))
    listing.is_active = True
    listing.expires_at = timezone.now() + timedelta(days=duration)
    listing.save(update_fields=["is_active", "expires_at"])
    return 200, listing


@router.put("/{listing_id}", response={200: ListingOut, 400: MessageOut, 401: MessageOut, 403: MessageOut, 404: MessageOut})
@csrf_protected
def update_listing(request, listing_id: int, payload: ListingUpdateIn):
    if not request.user.is_authenticated:
        return 401, {"detail": str(_("Authentication required."))}

    try:
        listing = Listing.objects.select_related("author__locality__state").get(pk=listing_id)
    except Listing.DoesNotExist:
        return 404, {"detail": str(_("Listing not found."))}

    if listing.author_id != request.user.pk and not request.user.is_superuser:
        return 403, {"detail": str(_("You can only edit your own listings."))}

    data = payload.dict(exclude_unset=True)
    if "product_name" in data:
        name = data["product_name"].strip()
        if not name:
            return 400, {"detail": str(_("Product name cannot be empty."))}
        data["product_name"] = name
    if "price" in data and data["price"] <= 0:
        return 400, {"detail": str(_("Price must be greater than zero."))}
    if "quantity" in data and data["quantity"] <= 0:
        return 400, {"detail": str(_("Quantity must be greater than zero."))}
    if "description" in data:
        data["description"] = data["description"].strip()

    for field, value in data.items():
        setattr(listing, field, value)

    if data:
        listing.save(update_fields=list(data.keys()))
    return 200, listing
