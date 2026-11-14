import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    # A tabela de garçons vira a tabela de funcionários (garçom, cozinha e bar).
    # Os garçons já cadastrados continuam com o cargo GARCOM.
    # A coluna de senha já foi criada pela migration 0019_garcom_senha.

    dependencies = [
        ("core", "0021_comanda_data_fechamento_comanda_garcom_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="garcom",
            name="garcom_salario_nao_negativo",
        ),
        migrations.RenameModel(
            old_name="Garcom",
            new_name="Funcionario",
        ),
        migrations.AlterModelTable(
            name="funcionario",
            table="funcionario",
        ),
        migrations.AddField(
            model_name="funcionario",
            name="cargo",
            field=models.CharField(
                choices=[("GARCOM", "Garçom"), ("COZINHA", "Cozinha"), ("BAR", "Bar")],
                default="GARCOM",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="funcionario",
            name="ativo",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="funcionario",
            name="gerente",
            field=models.ForeignKey(
                db_column="id_gerente",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="funcionarios",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="funcionario",
            constraint=models.CheckConstraint(
                condition=models.Q(("salario__gte", 0)),
                name="funcionario_salario_nao_negativo",
            ),
        ),
    ]
