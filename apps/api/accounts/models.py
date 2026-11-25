from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

from .phone_utils import normalize_phone


class UserManager(BaseUserManager["User"]):
    use_in_migrations = True

    def create_user(
        self,
        username: str,
        password: str | None = None,
        phone: str | None = None,
        **extra_fields,
    ):
        if not username:
            raise ValueError(_("Users must have a username."))
        if not phone:
            raise ValueError(_("Users must have a phone number."))
        user = self.model(username=username, phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        username: str,
        password: str | None = None,
        phone: str | None = None,
        **extra_fields,
    ):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(username, password, phone, **extra_fields)


class User(AbstractUser):
    class AccountType(models.TextChoices):
        FARMER = "farmer", _("Farmer")
        TRADER = "trader", _("Trader")

    username = models.CharField(_("username"), max_length=150, unique=True)
    phone = models.CharField(_("phone number"), max_length=32, unique=True)
    arabic_full_name = models.CharField(_("Arabic full name"), max_length=150)
    account_type = models.CharField(
        _("account type"),
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.FARMER,
    )
    allow_whatsapp = models.BooleanField(_("allow WhatsApp"), default=True)
    whatsapp_number = models.CharField(_("WhatsApp number"), max_length=32, blank=True, default="")
    allow_call = models.BooleanField(_("allow phone calls"), default=True)
    call_phone = models.CharField(_("call phone number"), max_length=32, blank=True, default="")
    locality = models.ForeignKey(
        "locations.Locality",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name=_("locality"),
    )
    bio = models.TextField(_("bio"), blank=True, default="")

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["phone"]

    objects = UserManager()

    def save(self, *args, **kwargs):
        self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.arabic_full_name
