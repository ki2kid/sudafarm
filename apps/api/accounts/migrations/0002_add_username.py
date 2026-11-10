from django.db import migrations, models
from django.utils.translation import gettext_lazy as _


def copy_phone_to_username(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(username__isnull=True).update(username=models.F("phone"))


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(
                max_length=150,
                null=True,
                unique=True,
                verbose_name=_("username"),
            ),
        ),
        migrations.RunPython(copy_phone_to_username, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.CharField(
                max_length=150,
                unique=True,
                verbose_name=_("username"),
            ),
        ),
    ]
