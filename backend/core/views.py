from django.db import connection, transaction
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda
)
from .serializers import (
    PedidoSerializer, CategoriaSerializer, GerenteSerializer, GarcomSerializer,
    MesaSerializer, CozinhaSerializer, ItemSerializer, ItensPedidoSerializer,
    ItensPromocaoSerializer, PromocaoSerializer, AbrirComandaSerializer,
    FiltroCardapioSerializer,ComandaConsultaSerializer)

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
    queryset = Pedido.objects.select_related('comanda__mesa', 'cozinha')
    serializer_class = PedidoSerializer 

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    def get_queryset(self):
        categorias = super().get_queryset()
        if self.action != 'list':
            return categorias

        filtro = FiltroCardapioSerializer(data=self.request.query_params)
        filtro.is_valid(raise_exception=True)
        tipo = filtro.validated_data.get('tipo_categoria')
        if tipo:
            categorias = categorias.filter(tipo_categoria=tipo)
        if 'disponivel' in filtro.validated_data:
            categorias = categorias.filter(
                itens__disponivel=filtro.validated_data['disponivel'],
            ).distinct()
        return categorias

class AbrirComandaView(APIView):
    def post(self, request, id_mesa):
        serializer = AbrirComandaSerializer(data=request.data)

        #Se CPF ou Telefone forem inválidos, retorna erro 400
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cpf = serializer.validated_data['cpf']
        telefone = serializer.validated_data['telefone']

        with transaction.atomic():
            # Bloqueia a mesa até terminar a abertura, evitando comandas simultâneas.
            try:
                mesa = Mesa.objects.select_for_update().get(id=id_mesa)
            except Mesa.DoesNotExist:
                return Response(
                    {"erro": "Mesa informada não existe no sistema."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if not mesa.ativo:
                return Response(
                    {'erro': 'Mesa não está ativa.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verifica se a mesa já possui comanda ativa
            if Comanda.objects.filter(mesa=mesa, ativa=True).exists():
                return Response(
                    {"erro": "Esta mesa já possui uma comanda em andamento. Procure o garçom para fechar a comanda atual."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Cria a nova comanda no MySQL
            nova_comanda = Comanda.objects.create(
                cpf=cpf,
                telefone=telefone,
                mesa=mesa,
                ativa=True
            )

        return Response(
            {
                "mensagem": "Comanda aberta com sucesso!",
                "id_comanda": nova_comanda.id
            },
            status=status.HTTP_201_CREATED
        )

class ConsultarComandaView(APIView):
    def get(self, request, id_mesa):
        # Verifica se a mesa existe
        if not Mesa.objects.filter(id=id_mesa).exists():
            return Response(
                {"erro": "Mesa informada não existe no sistema."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Busca a comanda ativa vinculada à mesa
        comanda = (
            Comanda.objects
            .filter(mesa_id=id_mesa, ativa=True)
            .prefetch_related("pedidos__itens_pedido__item")
            .order_by("-data_abertura")
            .first()
        )

        if comanda is None:
            return Response(
                {"erro": "Esta mesa não possui uma comanda ativa."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Converte a comanda e seus pedidos para JSON
        serializer = ComandaConsultaSerializer(comanda)

        return Response(serializer.data, status=status.HTTP_200_OK)

class GerenteViewSet(viewsets.ModelViewSet):
    queryset = Gerente.objects.all()
    serializer_class = GerenteSerializer

class GarcomViewSet(viewsets.ModelViewSet):
    queryset = Garcom.objects.all()
    serializer_class = GarcomSerializer

class MesaViewSet(viewsets.ModelViewSet):
    queryset = Mesa.objects.all()
    serializer_class = MesaSerializer


class CozinhaViewSet(viewsets.ModelViewSet):
    queryset = Cozinha.objects.all()
    serializer_class = CozinhaSerializer

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related('categoria')
    serializer_class = ItemSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    def get_queryset(self):
        itens = super().get_queryset()
        if self.action != 'list':
            return itens

        filtro = FiltroCardapioSerializer(data=self.request.query_params)
        filtro.is_valid(raise_exception=True)
        tipo = filtro.validated_data.get('tipo_categoria')
        if tipo:
            itens = itens.filter(categoria__tipo_categoria=tipo)
        if 'disponivel' in filtro.validated_data:
            itens = itens.filter(disponivel=filtro.validated_data['disponivel'])
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
