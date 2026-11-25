from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class AccountUserAdmin(UserAdmin):
    ordering = ("username",)
    list_display = (
        "username",
        "arabic_full_name",
        "account_type",
        "phone",
        "allow_whatsapp",
        "allow_call",
        "is_active",
    )
    list_filter = ("account_type", "allow_whatsapp", "allow_call", "is_staff", "is_active")
    fieldsets = (
        (None, {"fields": ("username", "phone", "password")}),
        (
            _("Personal info"),
            {"fields": ("arabic_full_name", "account_type", "locality", "bio", "first_name", "last_name", "email")},
        ),
        (
            _("Contact channels"),
            {"fields": ("allow_whatsapp", "whatsapp_number", "allow_call", "call_phone")},
        ),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "phone",
                    "arabic_full_name",
                    "account_type",
                    "allow_whatsapp",
                    "whatsapp_number",
                    "allow_call",
                    "call_phone",
                    "locality",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
