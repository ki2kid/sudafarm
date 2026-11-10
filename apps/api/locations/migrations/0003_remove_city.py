from django.db import migrations, models
import django.db.models.deletion


def copy_city_state(apps, schema_editor):
    Locality = apps.get_model("locations", "Locality")
    for locality in Locality.objects.select_related("city").iterator():
        locality.state_id = locality.city.state_id
        locality.save(update_fields=("state",))


class Migration(migrations.Migration):
    dependencies = [
        ("locations", "0002_alter_hospital_code_alter_state_code"),
    ]

    operations = [
        migrations.AddField(
            model_name="locality",
            name="state",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="localities",
                to="locations.state",
                verbose_name="state",
            ),
        ),
        migrations.RunPython(copy_city_state, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="locality",
            name="unique_locality_arabic_name_per_city",
        ),
        migrations.RemoveConstraint(
            model_name="locality",
            name="unique_locality_english_name_per_city",
        ),
        migrations.RemoveField(
            model_name="locality",
            name="city",
        ),
        migrations.DeleteModel(
            name="City",
        ),
        migrations.AlterField(
            model_name="locality",
            name="state",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="localities",
                to="locations.state",
                verbose_name="state",
            ),
        ),
        migrations.AddConstraint(
            model_name="locality",
            constraint=models.UniqueConstraint(
                fields=("state", "name_ar"),
                name="unique_locality_arabic_name_per_state",
            ),
        ),
        migrations.AddConstraint(
            model_name="locality",
            constraint=models.UniqueConstraint(
                fields=("state", "name_en"),
                name="unique_locality_english_name_per_state",
            ),
        ),
    ]
