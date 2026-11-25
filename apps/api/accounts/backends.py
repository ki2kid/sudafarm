from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from .phone_utils import normalize_phone


class UsernameOrPhoneBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("identifier")
        if identifier is None or password is None:
            return None

        # Normalise so that "0912345678" and "+249912345678" resolve to the same account.
        normalised = normalize_phone(identifier)

        user_model = get_user_model()
        try:
            user = user_model.objects.get(
                Q(username=identifier) | Q(phone=normalised)
            )
        except user_model.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
