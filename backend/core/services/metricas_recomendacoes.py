from collections import Counter
from itertools import permutations


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
