from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import Listing


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "product_name",
        "product_category",
        "listing_type",
        "price",
        "quantity",
        "unit",
        "author",
        "is_active",
        "created_at",
        "expires_at",
    )
    list_filter = ("listing_type", "product_category", "unit", "is_active")
    search_fields = ("product_name", "author__arabic_full_name", "description")
    raw_id_fields = ("author",)
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
