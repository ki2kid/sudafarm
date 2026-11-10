from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


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
    username = models.CharField(_("username"), max_length=150, unique=True)
    phone = models.CharField(_("phone number"), max_length=32, unique=True)
    arabic_full_name = models.CharField(_("Arabic full name"), max_length=150)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["phone"]

    objects = UserManager()

    def __str__(self):
        return self.arabic_full_name
