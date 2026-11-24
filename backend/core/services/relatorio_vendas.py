import csv
from collections import Counter
from decimal import Decimal
from io import BytesIO, StringIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from core.models import ItensPedido


def gerar_relatorio(comandas, data_inicio, data_fim, categoria=None, promocao=None):
    """Agrega as vendas das comandas finalizadas do período.

    Categoria e promoção filtram os itens considerados; comandas sem item que
    atenda ao filtro não entram nos totais. A média por comanda usa o
    faturamento dos itens filtrados dividido pelas comandas com venda.
    O horário de pico conta pedidos distintos pela hora de envio do pedido.
    """
    filtros = {}
    if categoria is not None:
        filtros['item__categoria_id'] = categoria
    if promocao is not None:
        filtros['promocao_aplicada_id'] = promocao

    vendas = ItensPedido.objects.filter(
        pedido__comanda__in=comandas, **filtros,
    ).order_by('pk').values(
        'pedido__comanda_id', 'pedido_id', 'pedido__data_pedido',
        'item_id', 'item__nome', 'item__categoria__nome', 'quantidade', 'preco',
    )

    produtos = Counter()
    nomes = {}
    categorias = Counter()
    comandas_com_venda = set()
    faturamento = Decimal('0')
    pedidos_por_hora = {}

    for venda in vendas.iterator():
        item_id = venda['item_id']
        quantidade = venda['quantidade']
        produtos[item_id] += quantidade
        nomes[item_id] = venda['item__nome']
        categorias[venda['item__categoria__nome']] += quantidade
        comandas_com_venda.add(venda['pedido__comanda_id'])
        faturamento += venda['preco'] * quantidade
        hora = timezone.localtime(venda['pedido__data_pedido']).hour
        pedidos_por_hora.setdefault(hora, set()).add(venda['pedido_id'])

    total_comandas = len(comandas_com_venda)
    media = (faturamento / total_comandas).quantize(Decimal('0.01')) if total_comandas else Decimal('0.00')

    return {
        'data_inicio': data_inicio.isoformat(),
        'data_fim': data_fim.isoformat(),
        'total_itens': sum(produtos.values()),
        'faturamento': f'{faturamento:.2f}',
        'total_comandas': total_comandas,
        'media_por_comanda': f'{media:.2f}',
        'produtos': [
            {'id': item_id, 'nome': nomes[item_id], 'quantidade': quantidade}
            for item_id, quantidade in sorted(produtos.items(), key=lambda produto: (-produto[1], produto[0]))
        ],
        'categorias': [
            {'nome': nome, 'quantidade': quantidade}
            for nome, quantidade in sorted(categorias.items(), key=lambda categoria: (-categoria[1], categoria[0]))
        ],
        'horarios': [
            {'hora': hora, 'pedidos': len(pedidos_por_hora.get(hora, ()))}
            for hora in range(24)
        ],
    }


def gerar_csv(relatorio):
    # Ponto e vírgula e BOM para abrir direto no Excel em português.
    saida = StringIO()
    escritor = csv.writer(saida, delimiter=';')
    escritor.writerow(['Relatório de vendas', relatorio['data_inicio'], relatorio['data_fim']])
    escritor.writerow(['Total de itens vendidos', relatorio['total_itens']])
    escritor.writerow(['Faturamento', relatorio['faturamento']])
    escritor.writerow(['Comandas finalizadas', relatorio['total_comandas']])
    escritor.writerow(['Média por comanda', relatorio['media_por_comanda']])
    escritor.writerow([])
    escritor.writerow(['Produto', 'Quantidade'])
    for produto in relatorio['produtos']:
        escritor.writerow([produto['nome'], produto['quantidade']])
    escritor.writerow([])
    escritor.writerow(['Categoria', 'Quantidade'])
    for categoria in relatorio['categorias']:
        escritor.writerow([categoria['nome'], categoria['quantidade']])
    escritor.writerow([])
    escritor.writerow(['Hora', 'Pedidos'])
    for horario in relatorio['horarios']:
        if horario['pedidos']:
            escritor.writerow([horario['hora'], horario['pedidos']])
    return saida.getvalue().encode('utf-8-sig')


def _tabela(dados):
    tabela = Table(dados, repeatRows=1, hAlign='LEFT')
    tabela.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
    ]))
    return tabela


def gerar_pdf(relatorio):
    buffer = BytesIO()
    documento = SimpleDocTemplate(buffer, pagesize=A4, title='Relatório de vendas')
    estilos = getSampleStyleSheet()
    elementos = [
        Paragraph('Relatório de vendas', estilos['Title']),
        Paragraph(f"Período: {relatorio['data_inicio']} a {relatorio['data_fim']}", estilos['Normal']),
        Spacer(1, 12),
        _tabela([
            ['Resumo', 'Valor'],
            ['Total de itens vendidos', relatorio['total_itens']],
            ['Faturamento', f"R$ {relatorio['faturamento']}"],
            ['Comandas finalizadas', relatorio['total_comandas']],
            ['Média por comanda', f"R$ {relatorio['media_por_comanda']}"],
        ]),
        Spacer(1, 18),
        Paragraph('Produtos mais vendidos', estilos['Heading2']),
        _tabela([['Produto', 'Quantidade']] + [
            [produto['nome'], produto['quantidade']] for produto in relatorio['produtos']
        ] or [['Produto', 'Quantidade'], ['Nenhum produto vendido', '']]),
        Spacer(1, 18),
        Paragraph('Vendas por categoria', estilos['Heading2']),
        _tabela([['Categoria', 'Quantidade']] + [
            [categoria['nome'], categoria['quantidade']] for categoria in relatorio['categorias']
        ] or [['Categoria', 'Quantidade'], ['Nenhuma venda', '']]),
        Spacer(1, 18),
        Paragraph('Pedidos por hora', estilos['Heading2']),
        _tabela([['Hora', 'Pedidos']] + [
            [f"{horario['hora']:02d}h", horario['pedidos']]
            for horario in relatorio['horarios'] if horario['pedidos']
        ] or [['Hora', 'Pedidos'], ['Nenhum pedido', '']]),
    ]
    documento.build(elementos)
    return buffer.getvalue()
