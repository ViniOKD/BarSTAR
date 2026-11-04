from collections import defaultdict
from math import isfinite

from django.db import migrations
from django.utils import timezone


def preparar_promocoes(apps, schema_editor):
    Promocao = apps.get_model("core", "Promocao")
    ItensPromocao = apps.get_model("core", "ItensPromocao")
    alias = schema_editor.connection.alias
    agora = timezone.now()
    promocoes = list(Promocao.objects.using(alias).order_by("pk"))
    participantes = list(
        ItensPromocao.objects.using(alias)
        .select_related("promocao")
        .order_by("pk")
    )
    com_participantes = {p.promocao_id for p in participantes}
    por_item = defaultdict(list)
    erros = []

    for promocao in promocoes:
        percentual = promocao.desconto_percentual
        if percentual is None or not isfinite(percentual) or not 0 < percentual < 100:
            erros.append(f"Promoção #{promocao.pk}: percentual inválido.")
        if promocao.data_fim <= promocao.data_inicio:
            erros.append(f"Promoção #{promocao.pk}: período inválido.")
        if promocao.removida_em is None and promocao.data_fim > agora:
            if promocao.pk not in com_participantes:
                erros.append(f"Promoção #{promocao.pk}: sem participantes.")

    for participante in participantes:
        promocao = participante.promocao
        if promocao.removida_em is None and promocao.data_fim > agora:
            por_item[participante.item_id].append(promocao)

    for item_id, candidatas in por_item.items():
        candidatas.sort(key=lambda p: (p.data_inicio, p.pk))
        for indice, anterior in enumerate(candidatas):
            for seguinte in candidatas[indice + 1:]:
                if seguinte.data_inicio >= anterior.data_fim:
                    break
                erros.append(
                    f"Produto #{item_id}: promoções #{anterior.pk} e "
                    f"#{seguinte.pk} possuem períodos sobrepostos."
                )

    if erros:
        raise RuntimeError("Corrija os registros antes de continuar:\n" + "\n".join(erros))

    for promocao in promocoes:
        if not promocao.nome.strip():
            Promocao.objects.using(alias).filter(pk=promocao.pk).update(
                nome=f"Promoção #{promocao.pk}",
            )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0013_promocoes_campos"),
    ]

    operations = [
        migrations.RunPython(
            preparar_promocoes,
            reverse_code=migrations.RunPython.noop,
            atomic=True,
        ),
    ]
