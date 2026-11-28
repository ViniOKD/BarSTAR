from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from core.models import Categoria, Comanda, Cozinha, Funcionario, ItensPedido, ItensPromocao, Pedido, Promocao
from .dar_preco import obter_precos_atuais
from .promocoes import bloquear_itens


# Comidas vão para a cozinha principal (1) e bebidas para a cozinha do bar (2).
COZINHA_POR_TIPO = {
    Categoria.TipoCategoria.PRATO: 1,
    Categoria.TipoCategoria.BEBIDA: 2,
}

# Quem trabalha na cozinha vê só comidas; quem trabalha no bar vê só bebidas.
COZINHA_POR_CARGO = {
    Funcionario.Cargo.COZINHA: COZINHA_POR_TIPO[Categoria.TipoCategoria.PRATO],
    Funcionario.Cargo.BAR: COZINHA_POR_TIPO[Categoria.TipoCategoria.BEBIDA],
}


def cozinha_do_usuario(usuario):
    # Retorna o id da cozinha do funcionário, ou None para quem vê todos os pedidos.
    cargo = getattr(usuario, "cargo", None)
    return COZINHA_POR_CARGO.get(cargo)


class PrecoAlterado(APIException):
    status_code = 409

    def __init__(self, itens_atualizados):
        self.detail = {
            "erro": "Os preços mudaram. Confira os valores e confirme novamente.",
            "codigo": "PRECO_ALTERADO",
            "itens_atualizados": itens_atualizados,
        }


@transaction.atomic
def enviar_pedido(*, comanda_id, itens):
    # Busca a comanda ativa e a bloqueia durante a transação.
    comanda = get_object_or_404(
        Comanda.objects.select_for_update(),
        pk=comanda_id,
        ativa=True,
    )

    ids_itens = []
    for linha in itens:
        ids_itens.append(linha["item_id"])

    # busca os IDs das promoções não removidas e ainda não encerradas.
    ids_promocoes = set(
        ItensPromocao.objects.filter(
            item_id__in=ids_itens,
            promocao__removida_em__isnull=True,
            promocao__data_fim__gt=timezone.now(),
        ).values_list("promocao_id", flat=True)
    )

    # bloqueia as promoções antes dos produtos.
    # a ordenação mantém uma ordem fixa para adquirir esses bloqueios.
    for promocao_id in sorted(ids_promocoes):
        Promocao.objects.select_for_update().filter(
            pk=promocao_id,
        ).first()

    # obtém e bloqueia os produtos usando a função auxiliar.
    produtos = bloquear_itens(ids_itens)

    ids_categorias = []
    for item in produtos.values():
        ids_categorias.append(item.categoria_id)
    categorias = Categoria.objects.in_bulk(ids_categorias)

    cozinhas = Cozinha.objects.in_bulk(COZINHA_POR_TIPO.values())
    if len(cozinhas) != 2:
        raise ValidationError({
            "erro": "As cozinhas necessárias não estão cadastradas.",
        })

    destinos = {}
    for item in produtos.values():
        # impede o envio de produtos indisponíveis.
        if not item.disponivel:
            raise ValidationError({
                "erro": f"O produto {item.nome} está indisponível.",
            })

        tipo = categorias[item.categoria_id].tipo_categoria
        cozinha_id = COZINHA_POR_TIPO.get(tipo)

        if cozinha_id is None:
            raise ValidationError({
                "erro": f"Categoria inválida para o produto {item.nome}.",
            })
        destinos[item.pk] = cozinha_id


    precos = obter_precos_atuais(
        produtos.values(),
        agora=timezone.now(),
    )

    # reúne os itens que precisam de uma nova confirmação do cliente.
    alterados = []

    for indice, linha in enumerate(itens):
        info = precos[linha["item_id"]]
        promocao = info["promocao"]

        preco_esperado = f'{linha['preco_esperado']:.2f}'
        preco_mudou = preco_esperado != info["preco_atual"]

        promocao_nao_bloqueada = (
            promocao is not None and promocao.pk not in ids_promocoes
        )

        if not preco_mudou and not promocao_nao_bloqueada:
            continue

        # inclui os dados da promoção na resposta, quando houver.
        promocao_atual = None

        if promocao is not None:
            promocao_atual = {
                "id": promocao.pk,
                "nome": promocao.nome,
                "desconto_percentual": promocao.desconto_percentual,
                "data_fim": promocao.data_fim.isoformat(),
            }

        alterados.append({
            "indice": indice,
            "item_id": linha["item_id"],
            "preco_esperado": preco_esperado,
            "preco_atual": info["preco_atual"],
            "promocao_atual": promocao_atual,
        })

    # interrompe o envio e informa os itens que precisam de nova confirmação.
    if alterados:
        raise PrecoAlterado(alterados)

    # guarda os pedidos criados para cada cozinha: {id_cozinha: pedido}.
    pedidos = {}

    for linha in itens:
        item = produtos[linha["item_id"]]
        cozinha_id = destinos[item.pk]

        # cria apenas um pedido por cozinha neste envio.
        if cozinha_id not in pedidos:
            pedidos[cozinha_id] = Pedido.objects.create(
                comanda=comanda,
                cozinha=cozinhas[cozinha_id],
            )

        info = precos[item.pk]
        promocao = info["promocao"]

        # adiciona o item ao pedido da cozinha correspondente.
        # registra preços e nomes para preservar o histórico da venda.
        ItensPedido.objects.create(
            pedido=pedidos[cozinha_id],
            item=item,
            quantidade=linha["quantidade"],
            observacoes=linha["observacoes"],
            preco=info["preco_atual"],
            preco_original=item.preco_unitario,
            nome_item_registrado=item.nome,
            promocao_aplicada=promocao,
            nome_promocao_registrada=promocao.nome if promocao else "",
        )

    # retorna a lista dos pedidos criados.
    return list(pedidos.values())