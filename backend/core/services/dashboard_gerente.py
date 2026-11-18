from decimal import Decimal

from core.models import ItensPedido
from backend.core.services.metricas_recomendacoes import calcular_metricas_associacoes


def resumir_dashboard(comandas):
    produtos = {}
    promocoes = {}
    cestas = {pk: set() for pk in comandas.values_list('pk', flat=True)}
    vendas = ItensPedido.objects.filter(pedido__comanda_id__in=cestas).order_by('pk').values(
        'pedido__comanda_id', 'item_id', 'item__nome', 'quantidade', 'preco',
        'promocao_aplicada_id', 'nome_promocao_registrada', 'promocao_aplicada__nome',
    )
    for venda in vendas.iterator():
        item_id = venda['item_id']
        cestas[venda['pedido__comanda_id']].add(item_id)
        produto = produtos.setdefault(item_id, {'id': item_id, 'nome': venda['item__nome'], 'quantidade': 0})
        produto['quantidade'] += venda['quantidade']
        promocao_id = venda['promocao_aplicada_id']
        if promocao_id is not None:
            promocao = promocoes.setdefault(promocao_id, {
                'id': promocao_id,
                'nome': venda['nome_promocao_registrada'] or venda['promocao_aplicada__nome'],
                'quantidade': 0, 'faturamento': Decimal('0.00'),
            })
            promocao['quantidade'] += venda['quantidade']
            promocao['faturamento'] += venda['preco'] * venda['quantidade']

    associacoes = [
        {**par, 'nome_antecedente': produtos[par['antecedente']]['nome'],
         'nome_consequente': produtos[par['consequente']]['nome']}
        for par in calcular_metricas_associacoes(cestas.values())
        if par['support'] >= 0.01 and par['confidence'] >= 0.30
        and par['lift'] >= 1.2 and par['ocorrencias'] >= 5
    ]
    associacoes.sort(key=lambda par: (-par['lift'], -par['confidence'], -par['ocorrencias'], par['antecedente'], par['consequente']))
    ranking_promocoes = sorted(promocoes.values(), key=lambda p: (-p['faturamento'], p['id']))
    for promocao in ranking_promocoes:
        promocao['faturamento'] = f"{promocao['faturamento']:.2f}"

    return {
        'total_comandas': len(cestas),
        'produtos': sorted(produtos.values(), key=lambda p: (-p['quantidade'], p['id'])),
        'associacoes': associacoes,
        'promocoes': ranking_promocoes,
    }
