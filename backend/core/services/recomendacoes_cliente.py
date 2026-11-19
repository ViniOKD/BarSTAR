from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum
from core.models import Comanda, Item, ItensPedido
from .metricas_recomendacoes import calcular_metricas_associacoes

def obter_sugestoes_cliente(itens_atuais_ids, limite=3):

    ultimos_seis_meses = timezone.now() - timedelta(day=180)

    comandas_historico = Comanda.objects.filter(
        data_fechamento__gte = ultimos_seis_meses,
        ativa=False
    ).prefetch_related('pedidos__itens_pedido') 

    #Lista de lista com os IDs de cada comanda
    historico_ids = []
    for comanda in comandas_historico:
        ids_comanda = list(comanda.pedidos.values_list('itens_pedido__item_id', flat=True))
        if ids_comanda:
            historico_ids.append(ids_comanda)

    regras = calcular_metricas_associacoes(historico_ids)  

    sugestoes_dic = {}
    for regra in regras:
        ant = regra['antecedente'] 
        cons = regra['consequente']

        #Se antecedente está no carrinho e consequente não
        if ant in itens_atuais_ids and cons not in itens_atuais_ids:
            # Lift > 1: significa que um produto impulsiona a venda do outro
            if regra['lift'] > 1:
                #Se o item já foi sugerido por outro produto, mantem o de maior lift 
                if cons not in sugestoes_dic or sugestoes_dic[cons]['lift'] < regra['lift']:  
                    sugestoes_dic[cons] = regra  
                      
    # Ordena sugesties pelo maior lift
    top_ids_sugetidos = sorted(sugestoes_dic.keys(), key=lambda k: sugestoes_dic[k]['lift'], reverse=True) 

    # Filtra no banco pra garantir que estão disponiveis
    itens_recomendados = list(Item.objects.filter(id__in=top_ids_sugetidos, disponivel=True)[:limite])

    # Se não achou 03 itens preenche com os mais vendidos gerais
    if len(itens_recomendados) < limite:
        falta_sugerir = limite - len(itens_recomendados)
        ids_recomendados = []
        for item in itens_recomendados: 
            ids_recomendados.append(item.id)
        itens_seleciodados = itens_atuais_ids + ids_recomendados

        mais_vendidos = Item.objects.filter(
            itens_pedido__pedido__comanda__ativa=False,
            itens_pedido__pedido__comanda__data_fechamento__gte=ultimos_seis_meses,
            disponivel=True
        ).exclude(
            id__in=itens_seleciodados
        ).annotate(
            total_vendido=Sum('itens_pedido__quantidade') 
        ).order_by('-total_vendido')[:falta_sugerir] # ordem decrescente

        itens_recomendados.extend(list(mais_vendidos))


    return itens_recomendados