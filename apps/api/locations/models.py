from django.db import models
from django.core.validators import RegexValidator
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


class Hospital(models.Model):
    class HospitalType(models.TextChoices):
        GOVERNMENT = "government", _("Government")
        PRIVATE = "private", _("Private")
        CHARITY = "charity", _("Charity")
        OTHER = "other", _("Other")

    name_ar = models.CharField(_("Arabic name"), max_length=200)
    name_en = models.CharField(_("English name"), max_length=200)
    code = models.CharField(
        _("three-digit code"),
        max_length=3,
        unique=True,
        validators=[RegexValidator(r"^\d{3}$", _("Code must contain exactly three digits."))],
    )
    type = models.CharField(_("type"), max_length=20, choices=HospitalType.choices)
    license_number = models.CharField(_("license number"), max_length=100, unique=True)
    phone = models.CharField(_("phone"), max_length=32)
    email = models.EmailField(_("email"))
    address_line = models.CharField(_("address line"), max_length=255)
    neighborhood = models.ForeignKey(
        Neighborhood,
        on_delete=models.PROTECT,
        related_name="hospitals",
        verbose_name=_("neighborhood"),
        null=True,
        blank=True,
    )
    latitude = models.DecimalField(_("latitude"), max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(_("longitude"), max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(_("active"), default=True)
    contract_start = models.DateField(_("contract start"))
    contract_end = models.DateField(_("contract end"), null=True, blank=True)

    class Meta:
        ordering = ("name_ar",)
        verbose_name = _("hospital")
        verbose_name_plural = _("hospitals")

    def __str__(self):
        return self.name_ar


class Department(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="departments", verbose_name=_("hospital"))
    name_ar = models.CharField(_("Arabic name"), max_length=150)
    name_en = models.CharField(_("English name"), max_length=150)
    floor = models.IntegerField(_("floor"))

    class Meta:
        ordering = ("hospital", "name_ar")
        constraints = [
            models.UniqueConstraint(fields=("hospital", "name_ar"), name="unique_department_arabic_name_per_hospital"),
            models.UniqueConstraint(fields=("hospital", "name_en"), name="unique_department_english_name_per_hospital"),
        ]
        verbose_name = _("department")
        verbose_name_plural = _("departments")

    def __str__(self):
        return f"{self.hospital.name_ar} - {self.name_ar}"
