from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class State(models.Model):
    name_ar = models.CharField(_("Arabic name"), max_length=150)
    name_en = models.CharField(_("English name"), max_length=150)
    code = models.CharField(
        _("three-digit code"),
        max_length=3,
        unique=True,
        validators=[RegexValidator(r"^\d{3}$", _("Code must contain exactly three digits."))],
    )

    class Meta:
        ordering = ("name_ar",)
        verbose_name = _("state")
        verbose_name_plural = _("states")

    def __str__(self):
        return self.name_ar


class Locality(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="localities", verbose_name=_("state"))
    name_ar = models.CharField(_("Arabic name"), max_length=150)
    name_en = models.CharField(_("English name"), max_length=150)

    class Meta:
        ordering = ("name_ar",)
        constraints = [
            models.UniqueConstraint(fields=("state", "name_ar"), name="unique_locality_arabic_name_per_state"),
            models.UniqueConstraint(fields=("state", "name_en"), name="unique_locality_english_name_per_state"),
        ]
        verbose_name = _("locality")
        verbose_name_plural = _("localities")

    def __str__(self):
        return self.name_ar


class Neighborhood(models.Model):
    locality = models.ForeignKey(
        Locality,
        on_delete=models.CASCADE,
        related_name="neighborhoods",
        verbose_name=_("locality"),
    )
    name_ar = models.CharField(_("Arabic name"), max_length=150)
    name_en = models.CharField(_("English name"), max_length=150)

    class Meta:
        ordering = ("name_ar",)
        constraints = [
            models.UniqueConstraint(fields=("locality", "name_ar"), name="unique_neighborhood_arabic_name_per_locality"),
            models.UniqueConstraint(fields=("locality", "name_en"), name="unique_neighborhood_english_name_per_locality"),
        ]
        verbose_name = _("neighborhood")
        verbose_name_plural = _("neighborhoods")

    def __str__(self):
        return self.name_ar
