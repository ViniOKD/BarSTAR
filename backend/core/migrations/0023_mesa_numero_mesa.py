from django.db import migrations, models


def preencher_numero_mesa(apps, schema_editor):
    # As mesas já cadastradas mantêm o número que aparecia nas telas (o id).
    Mesa = apps.get_model("core", "Mesa")
    for mesa in Mesa.objects.all():
        mesa.numero_mesa = mesa.id
        mesa.save(update_fields=["numero_mesa"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0022_funcionario"),
    ]

    operations = [
        migrations.AddField(
            model_name="mesa",
            name="numero_mesa",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.RunPython(preencher_numero_mesa, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="mesa",
            name="numero_mesa",
            field=models.PositiveIntegerField(unique=True),
        ),
        migrations.AlterModelOptions(
            name="mesa",
            options={"ordering": ["numero_mesa"]},
        ),
    ]
