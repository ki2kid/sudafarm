from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class UsernameOrPhoneBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("identifier")
        if identifier is None or password is None:
            return None

        user_model = get_user_model()
        try:
            user = user_model.objects.get(
                Q(username=identifier) | Q(phone=identifier)
            )
        except user_model.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
