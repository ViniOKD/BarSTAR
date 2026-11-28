from decimal import Decimal
from django.utils import timezone
from core.models import ItensPedido
from core.services.metricas_recomendacoes import (
    calcular_dias_baixo_movimento,
    calcular_metricas_associacoes,
    calcular_volume_vendas,
)
def resumir_dashboard(comandas, produtos, data_inicio, data_fim):
    comandas = list(comandas.values('id', 'ativa', 'data_abertura', 'data_fechamento'))
    produtos = list(produtos)
    nomes = dict(produtos)

    finalizadas = {}
    for comanda in comandas:
        if comanda['ativa'] or comanda['data_fechamento'] is None:
            continue
        if data_inicio <= timezone.localtime(comanda['data_fechamento']).date() <= data_fim:
            finalizadas[comanda['id']] = comanda

    vendidos = {}
    promocoes = {}
    faturamento = {}
    cestas = {pk: set() for pk in finalizadas}
    vendas = ItensPedido.objects.filter(pedido__comanda_id__in=cestas).order_by('pk').values(
        'pedido__comanda_id', 'item_id', 'quantidade', 'preco',
        'promocao_aplicada_id', 'nome_promocao_registrada', 'promocao_aplicada__nome',
    )
    for venda in vendas.iterator():
        comanda_id = venda['pedido__comanda_id']
        item_id = venda['item_id']
        cestas[comanda_id].add(item_id)
        vendidos[item_id] = vendidos.get(item_id, 0) + venda['quantidade']
        faturamento[comanda_id] = faturamento.get(comanda_id, Decimal('0')) + venda['preco'] * venda['quantidade']
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
        {**par, 'nome_antecedente': nomes[par['antecedente']],
         'nome_consequente': nomes[par['consequente']]}
        for par in calcular_metricas_associacoes(cestas.values())
        if par['support'] >= 0.01 and par['confidence'] >= 0.30
        and par['lift'] >= 1.2 and par['ocorrencias'] >= 5
    ]
    associacoes.sort(key=lambda par: (-par['lift'], -par['confidence'], -par['ocorrencias'], par['antecedente'], par['consequente']))
    ranking_promocoes = sorted(promocoes.values(), key=lambda p: (-p['faturamento'], p['id']))
    for promocao in ranking_promocoes:
        promocao['faturamento'] = f"{promocao['faturamento']:.2f}"

    # Dia aberto = dia com alguma comanda aberta; dias sem comanda nenhuma são
    # indistinguíveis de dias fechados, pois o sistema não registra funcionamento.
    dias = {}
    for comanda in comandas:
        abertura = timezone.localtime(comanda['data_abertura']).date()
        if data_inicio <= abertura <= data_fim:
            dias.setdefault(abertura, [0, Decimal('0')])
        if comanda['data_fechamento'] is None:
            continue
        fechamento = timezone.localtime(comanda['data_fechamento']).date()
        if not data_inicio <= fechamento <= data_fim:
            continue
        dia = dias.setdefault(fechamento, [0, Decimal('0')])
        if comanda['id'] in finalizadas:
            dia[0] += 1
            dia[1] += faturamento.get(comanda['id'], Decimal('0'))

    # shortcut: agrupa os dias em Python; trocar por agregação SQL se o histórico crescer.
    movimento = calcular_dias_baixo_movimento(
        (data, quantidade, total) for data, (quantidade, total) in dias.items()
    )

    return {
        'total_comandas': len(finalizadas),
        'produtos': calcular_volume_vendas(vendidos.items(), produtos),
        'associacoes': associacoes,
        'promocoes': ranking_promocoes,
        'movimento': movimento,
    }
