from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("locations", "0003_remove_city"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Department",
        ),
        migrations.DeleteModel(
            name="Hospital",
        ),
    ]
