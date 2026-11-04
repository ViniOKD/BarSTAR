from django.core.exceptions import ValidationError as ModelValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from core.models import Item, ItensPromocao, Promocao
from .dar_preco import calcular_preco_final


class ConflitoPromocao(APIException):
    status_code = 409

    def __init__(self, conflitos):
        self.detail = {
            "erro": "Há produtos em outra promoção no período informado.",
            "codigo": "CONFLITO_PROMOCAO",
            "conflitos": conflitos,
        }


def bloquear_itens(ids):
    itens = {}
    for item_id in sorted(set(ids)):
        try:
            itens[item_id] = Item.objects.select_for_update().get(pk=item_id)
        except Item.DoesNotExist:
            raise ValidationError({"itens": f"Produto #{item_id} não encontrado."})
    return itens


def validar_preco_do_participante(item, percentual):
    try:
        calcular_preco_final(item.preco_unitario, percentual)
    except ValueError as erro:
        raise ValidationError({"itens": f"{item.nome}: {erro}"})


@transaction.atomic
def salvar_promocao(*, usuario, dados, promocao_id=None):
    if promocao_id is None:
        promocao = Promocao(gerente=usuario)
        anteriores = []
    else:
        promocao = get_object_or_404(
            Promocao.objects.select_for_update(),
            pk=promocao_id, removida_em__isnull=True,
        )
        anteriores = list(promocao.itens_promocao.values_list("item_id", flat=True))

    ids = dados.get("itens", anteriores)
    if not ids:
        raise ValidationError({"itens": "Selecione pelo menos um produto."})
    if len(ids) != len(set(ids)):
        raise ValidationError({"itens": "Não repita um produto na promoção."})
    itens = bloquear_itens(anteriores + ids)

    for campo in ("nome", "descricao", "desconto_percentual", "data_inicio", "data_fim"):
        if campo in dados:
            setattr(promocao, campo, dados[campo])

    promocao.nome = promocao.nome.strip()
    if not promocao.nome:
        raise ValidationError({"nome": "Informe o nome da promoção."})
    percentual = promocao.desconto_percentual
    if percentual is None or not 0 < percentual < 100:
        raise ValidationError({"desconto_percentual": "Informe um percentual maior que zero e menor que 100."})
    if (promocao.data_inicio is None or promocao.data_fim is None
            or promocao.data_fim <= promocao.data_inicio):
        raise ValidationError({"data_fim": "O fim deve ser posterior ao início."})
    try:
        promocao.full_clean()
    except ModelValidationError as erro:
        raise ValidationError(erro.message_dict)

    for item_id in ids:
        validar_preco_do_participante(itens[item_id], percentual)

    candidatas = ItensPromocao.objects.filter(
        item_id__in=ids,
        promocao__removida_em__isnull=True,
        promocao__data_inicio__lt=promocao.data_fim,
        promocao__data_fim__gt=promocao.data_inicio,
    ).exclude(promocao_id=promocao.pk).select_related("item", "promocao")
    conflitos = [{
        "item_id": p.item_id,
        "produto": p.item.nome,
        "promocao_id": p.promocao_id,
        "promocao": p.promocao.nome,
        "data_inicio": p.promocao.data_inicio.isoformat(),
        "data_fim": p.promocao.data_fim.isoformat(),
    } for p in candidatas]
    if conflitos:
        raise ConflitoPromocao(conflitos)

    promocao.save()
    if "itens" in dados:
        promocao.itens_promocao.all().delete()
        ItensPromocao.objects.bulk_create([
            ItensPromocao(promocao=promocao, item_id=item_id) for item_id in ids
        ])
    return promocao


@transaction.atomic
def remover_promocao(*, promocao_id):
    promocao = get_object_or_404(
        Promocao.objects.select_for_update(),
        pk=promocao_id, removida_em__isnull=True,
    )
    bloquear_itens(promocao.itens_promocao.values_list("item_id", flat=True))
    promocao.removida_em = timezone.now()
    promocao.save(update_fields=["removida_em"])


def validar_alteracao_preco_normal(*, item, novo_preco):
    promocoes = ItensPromocao.objects.filter(
        item=item,
        promocao__removida_em__isnull=True,
        promocao__data_fim__gt=timezone.now(),
    ).select_related("promocao")
    for participante in promocoes:
        try:
            calcular_preco_final(novo_preco, participante.promocao.desconto_percentual)
        except ValueError as erro:
            raise ValidationError({
                "preco_unitario": f"O novo preço é incompatível com a promoção {participante.promocao.nome}: {erro}",
            })
