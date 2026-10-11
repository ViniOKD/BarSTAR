from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao,
)
from .serializers import (
    PedidoSerializer, CategoriaSerializer, GerenteSerializer, GarcomSerializer,
    MesaSerializer, CozinhaSerializer, ItemSerializer, ItensPedidoSerializer,
    ItensPromocaoSerializer, PromocaoSerializer)

# Uma view (ou viewset) é o "controlador" que recebe a requisição do usuário, 
# processa a lógica necessária usando seus modelos e serializers, 
# e devolve a resposta final adequada (como os dados em JSON ou uma mensagem de erro). 



@require_GET
def health(request):
    # verifica se o Django consegue consultar o banco
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()

    return JsonResponse({
        "status": "ok",
        "message": "React, Django e MySQL conectados",
    })

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer 

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

class GerenteViewSet(viewsets.ModelViewSet):
    queryset = Gerente.objects.all()
    serializer_class = GerenteSerializer

class GarcomViewSet(viewsets.ModelViewSet):
    queryset = Garcom.objects.all()
    serializer_class = GarcomSerializer

class MesaViewSet(viewsets.ModelViewSet):
    queryset = Mesa.objects.all()
    serializer_class = MesaSerializer

    @action(detail=True, methods=['post'], url_path='abrir-comanda')
    def abrir_comanda(self, request, pk=None):
        mesa = self.get_object()
        if not mesa.ativo:
            raise ValidationError({'detail': 'Mesa não está ativa.'})
        
        mesa_aberta = mesa.pedidos.filter(concluido=False).first() 
        if mesa_aberta: # se a mesa estiver com um pedido em aberto, retorna o pedido existente
            return Response(
                PedidoSerializer(aberta).data, status=status.HTTP_200_OK
            )
        cozinha = Cozinha.objects.first()  # seleciona a primeira cozinha disponível - nao sei se ta certo - REVER LOGICA 
        pedido = Pedido.objects.create(mesa=mesa, cozinha=cozinha) # cria o pedido
        return Response(
            PedidoSerializer(pedido).data, status=status.HTTP_201_CREATED
        )
        

class CozinhaViewSet(viewsets.ModelViewSet):
    queryset = Cozinha.objects.all()
    serializer_class = CozinhaSerializer

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related('categoria')
    serializer_class = ItemSerializer

    def get_queryset(self):
        itens = super().get_queryset()
        tipo = self.request.query_params.get('tipo_categoria')
        if tipo:
            itens = itens.filter(categoria__tipo_categoria=tipo)
        return itens

class ItensPedidoViewSet(viewsets.ModelViewSet):
    queryset = ItensPedido.objects.all()
    serializer_class = ItensPedidoSerializer

class ItensPromocaoViewSet(viewsets.ModelViewSet):
    queryset = ItensPromocao.objects.all()
    serializer_class = ItensPromocaoSerializer

class PromocaoViewSet(viewsets.ModelViewSet):
    queryset = Promocao.objects.all()
    serializer_class = PromocaoSerializer
