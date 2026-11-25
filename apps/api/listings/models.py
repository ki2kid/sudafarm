from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

DEFAULT_EXPIRY_DAYS = 30


class Listing(models.Model):
    class ListingType(models.TextChoices):
        SELL = "sell", _("Sell")
        BUY = "buy", _("Buy")

    class ProductCategory(models.TextChoices):
        SESAME = "sesame", _("Sesame")
        SORGHUM = "sorghum", _("Sorghum")
        GROUNDNUT = "groundnut", _("Groundnut")
        WHEAT = "wheat", _("Wheat")
        MILLET = "millet", _("Millet")
        COTTON = "cotton", _("Cotton")
        GUM_ARABIC = "gum_arabic", _("Gum Arabic")
        SACKS = "sacks", _("Sacks")
        FERTILIZER = "fertilizer", _("Fertilizer")
        SEEDS = "seeds", _("Seeds")
        PESTICIDE = "pesticide", _("Pesticide")
        OTHER = "other", _("Other")

    class Unit(models.TextChoices):
        KG = "kg", _("Kilogram")
        TON = "ton", _("Ton")
        SACK = "sack", _("Sack")
        PIECE = "piece", _("Piece")
        LITER = "liter", _("Liter")

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
        verbose_name=_("author"),
    )
    listing_type = models.CharField(_("listing type"), max_length=10, choices=ListingType.choices)
    product_category = models.CharField(_("product category"), max_length=20, choices=ProductCategory.choices)
    product_name = models.CharField(_("product name"), max_length=150)
    price = models.DecimalField(_("price (SDG)"), max_digits=12, decimal_places=2)
    quantity = models.DecimalField(_("quantity"), max_digits=10, decimal_places=2)
    unit = models.CharField(_("unit"), max_length=10, choices=Unit.choices, default=Unit.KG)
    description = models.TextField(_("description"), blank=True, default="")
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    expires_at = models.DateTimeField(_("expires at"))
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("listing")
        verbose_name_plural = _("listings")
        indexes = [
            models.Index(fields=["is_active", "expires_at"]),
            models.Index(fields=["author", "-created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=DEFAULT_EXPIRY_DAYS)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_listing_type_display()} — {self.product_name} ({self.author})"
