from django.utils import timezone
from rest_framework.exceptions import ValidationError
from core.models import ItensPromocao

def calcular_preco_final(preco_original, desconto_percentual):
    original = float(preco_original)
    percentual = float(desconto_percentual)

    if original <= 0:
        raise ValueError("Preço normal inválido.")

    if not 0 < percentual < 100:
        raise ValueError("O percentual deve ser maior que zero e menor que 100.")

    final = round(original * (1 - percentual / 100), 2)

    if not 0 < final < original:
        raise ValueError("O desconto não produz um preço promocional válido.")

    return final

def obter_precos_atuais(itens, agora=None):
    itens = list(itens)

    if not itens:
        return {}

    # usa o horário informado ou o horário atual.
    if agora is None:
        agora = timezone.now()

    ids_itens = []
    for item in itens:
        ids_itens.append(item.pk)

    # busca os vínculos com promoções vigentes e não removidas.
    participantes = ItensPromocao.objects.filter(
        item_id__in=ids_itens,
        promocao__removida_em__isnull=True,
        promocao__data_inicio__lte=agora,
        promocao__data_fim__gt=agora,
    ).select_related("promocao")

    promocoes = {}
    for participante in participantes:
        id_item = participante.item_id
        if id_item in promocoes:
            raise ValidationError({
                "erro": (
                    f"O produto #{id_item} está em promoções sobrepostas."
                )
            })

        promocoes[id_item] = participante.promocao

    precos = {}
    for item in itens:
        promocao = promocoes.get(item.pk)

        # mantém o preço normal quando não existe promoção vigente.
        preco = item.preco_unitario

        if promocao:
            try:
                preco = calcular_preco_final(
                    item.preco_unitario,
                    promocao.desconto_percentual,
                )
            except ValueError as erro:
                raise ValidationError({
                    "erro": f"{item.nome}: {erro}"
                })
        precos[item.pk] = {
            "preco_atual": f"{preco:.2f}",
            "promocao": promocao,
        }

    return precos