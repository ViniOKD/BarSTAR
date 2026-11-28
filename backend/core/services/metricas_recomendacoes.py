from collections import Counter
from decimal import Decimal
from itertools import permutations

DIAS_DA_SEMANA = (
    'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira',
    'sexta-feira', 'sábado', 'domingo',
)


def calcular_metricas_associacoes(comandas):
    """Calcula support, confidence e lift dos pares de produtos observados.

    Recebe um iterável de comandas, cada uma contendo os IDs inteiros dos
    produtos comprados. O chamador deve fornecer somente comandas finalizadas
    do estabelecimento e do período analisados, reunindo todos os seus pedidos.
    Repetições de um produto contam uma vez; comandas vazias entram no total.

    Para A -> B, sendo N o total de comandas:
    support = ocorrências(A e B) / N
    confidence = ocorrências(A e B) / ocorrências(A)
    lift = confidence / (ocorrências(B) / N)

    Retorna pares com ao menos uma ocorrência, ordenados pelos IDs (A, B),
    sem arredondamento, filtros mínimos ou classificação de relevância.
    Support e confidence são proporções de 0 a 1, não percentuais.
    Histórico vazio ou sem pares retorna uma lista vazia.
    """
    total_comandas = 0
    ocorrencias_produtos = Counter()
    ocorrencias_pares = Counter()

    for comanda in comandas:
        produtos = set(comanda)
        total_comandas += 1
        ocorrencias_produtos.update(produtos)
        ocorrencias_pares.update(permutations(produtos, 2))

    resultados = []
    for (antecedente, consequente), ocorrencias in sorted(ocorrencias_pares.items()):
        confidence = ocorrencias / ocorrencias_produtos[antecedente]
        resultados.append({
            'antecedente': antecedente,
            'consequente': consequente,
            'ocorrencias': ocorrencias,
            'support': ocorrencias / total_comandas,
            'confidence': confidence,
            'lift': confidence / (ocorrencias_produtos[consequente] / total_comandas),
        })

    return resultados


def calcular_volume_vendas(vendas, produtos):
    """Substitui o giro de estoque enquanto o sistema não registra estoque.

    Recebe as vendas como pares (ID do produto, quantidade), já filtradas pelo
    período e pelas comandas finalizadas, e o catálogo como pares (ID, nome).

    Retorna a soma das unidades vendidas por produto e a participação de cada
    um no total de unidades (proporção de 0 a 1). Produtos do catálogo sem
    venda aparecem com quantidade e participação zeradas. Ordena por
    quantidade decrescente, desempatando pelo ID.

    Giro real exigiria estoque médio: giro = quantidade vendida / estoque médio.
    """
    quantidades = Counter()
    for id_produto, quantidade in vendas:
        quantidades[id_produto] += quantidade

    total = sum(quantidades.values())
    resultados = [
        {
            'id': id_produto,
            'nome': nome,
            'quantidade': quantidades[id_produto],
            'participacao': quantidades[id_produto] / total if total else 0.0,
        }
        for id_produto, nome in produtos
    ]
    return sorted(resultados, key=lambda produto: (-produto['quantidade'], produto['id']))


def calcular_dias_baixo_movimento(dias_abertos, minimo_dias=8, limite=0.7):
    """Agrupa o movimento por dia da semana e aponta os dias fracos.

    Recebe os dias abertos como (data, comandas finalizadas, faturamento), com
    uma entrada por dia, inclusive os dias abertos sem venda (quantidade zero).
    Exigir menos de `minimo_dias` exemplos de um dia da semana o exclui da
    classificação. Um dia é de baixo movimento quando sua média de comandas
    fica abaixo de `limite` (70%) da média geral por dia aberto.

    Feriados e fechamentos excepcionais ainda não são registrados e podem
    distorcer o resultado. Retorna a média geral e os dias fracos em ordem
    crescente de média de comandas, com a média de faturamento como complemento.
    """
    por_dia = {}
    total_comandas = 0
    total_dias = 0
    for data, comandas, faturamento in dias_abertos:
        dados = por_dia.setdefault(data.weekday(), [0, 0, Decimal('0')])
        dados[0] += 1
        dados[1] += comandas
        dados[2] += Decimal(str(faturamento))
        total_comandas += comandas
        total_dias += 1

    if total_dias == 0:
        return {'media_geral_comandas': 0.0, 'dias_baixo_movimento': []}

    media_geral = Decimal(total_comandas) / total_dias
    limite_comandas = media_geral * Decimal(str(limite))

    baixos = []
    for dia_semana, (dias, comandas, faturamento) in por_dia.items():
        media_comandas = Decimal(comandas) / dias
        # Decimal evita que 70% de 10 vire 7.000000000000001 e marque o limite exato.
        if dias >= minimo_dias and media_comandas < limite_comandas:
            baixos.append({
                'dia_semana': DIAS_DA_SEMANA[dia_semana],
                'dias_observados': dias,
                'media_comandas': float(media_comandas),
                'media_faturamento': f'{faturamento / dias:.2f}',
            })

    baixos.sort(key=lambda dia: dia['media_comandas'])
    return {'media_geral_comandas': float(media_geral), 'dias_baixo_movimento': baixos}
