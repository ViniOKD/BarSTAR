from django.db import connection, transaction
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.contrib.auth import authenticate, login, logout
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly
from django.utils import timezone
from decimal import Decimal

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

         # Pega os parâmetros da URL
        query_params = self.request.query_params
        
        # Só aplica o filtro se houver algum parâmetro na URL
        if query_params:
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

class EnviarPedidoView(APIView):
    def post(self, request):
        comanda_id = request.data.get("comanda_id")
        itens = request.data.get("itens")

        if not comanda_id:
            return Response(
                {"erro": "A identificação da comanda é obrigatória."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(itens, list) or not itens:
            return Response(
                {"erro": "O pedido precisa conter pelo menos um item."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                comanda = Comanda.objects.get(
                    id=comanda_id,
                    ativa=True
                )
            except Comanda.DoesNotExist:
                return Response(
                    {"erro": "Comanda não encontrada ou inativa."},
                    status=status.HTTP_404_NOT_FOUND
                )
            try:
                cozinha_principal = Cozinha.objects.get(id=1)
                cozinha_bar = Cozinha.objects.get(id=2)
            except Cozinha.DoesNotExist:
                return Response(
                    {"erro": "As cozinhas necessárias não estão cadastradas."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            agora = timezone.now()
            pedidos_criados = {}

            for item_dados in itens:
                item_id = item_dados.get("item_id")
                quantidade = item_dados.get("quantidade")
                if not item_id or isinstance(quantidade, bool) or not isinstance(quantidade, int) or quantidade < 1:
                    return Response(
                        {"erro": "Item ou quantidade inválida."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    item = Item.objects.select_related(
                        "categoria"
                    ).get(id=item_id, disponivel=True)
                except Item.DoesNotExist:
                    return Response(
                        {"erro": f"Item {item_id} não encontrado ou indisponível."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if item.categoria.tipo_categoria == Categoria.TipoCategoria.PRATO:
                    cozinha = cozinha_principal
                elif item.categoria.tipo_categoria == Categoria.TipoCategoria.BEBIDA:
                    cozinha = cozinha_bar
                else:
                    return Response(
                        {"erro": f"Categoria inválida para o item {item.nome}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if cozinha.id not in pedidos_criados:
                    pedidos_criados[cozinha.id] = Pedido.objects.create(
                        comanda=comanda,
                        cozinha=cozinha
                    )

                # Consulta uma promoção vigente para o item.
                promocao_item = (
                    ItensPromocao.objects
                    .filter(
                        item=item,
                        promocao__data_inicio__lte=agora,
                        promocao__data_fim__gte=agora
                    )
                    .select_related("promocao")
                    .order_by("-promocao__data_inicio")
                    .first()
                )
                preco = item.preco_unitario

                if promocao_item:
                    desconto = Decimal(
                        str(promocao_item.promocao.desconto_percentual)
                    )
                    preco = preco * (Decimal("1") - desconto / Decimal("100"))
                ItensPedido.objects.create(
                    pedido=pedidos_criados[cozinha.id],
                    item=item,
                    preco=preco,
                    quantidade=quantidade,
                    observacoes=item_dados.get("observacoes", "")
                )
        return Response(
            {
                "mensagem": "Pedido enviado para preparo com sucesso!",
                "pedidos": [
                    {
                        "id": pedido.id,
                        "cozinha": pedido.cozinha.nome
                    }
                    for pedido in pedidos_criados.values()
                ]
            },
            status=status.HTTP_201_CREATED
        )
    
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

    def perform_create(self, serializer):
        serializer.save(gerente=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'Este produto possui vínculos que impedem sua exclusão. '
                        'Você pode torná-lo indisponível para retirá-lo do cardápio.'
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )
    
    def get_queryset(self):
        itens = super().get_queryset()
        if self.action != 'list':
            return itens

        # Pega os parâmetros da URL
        query_params = self.request.query_params

        # Só aplica o filtro se houver algum parâmetro na URL
        if query_params:
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

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"erro": "Não é permitido remover um item que já foi enviado para preparo."},
            status=status.HTTP_403_FORBIDDEN
        )

class ItensPromocaoViewSet(viewsets.ModelViewSet):
    queryset = ItensPromocao.objects.all()
    serializer_class = ItensPromocaoSerializer

class PromocaoViewSet(viewsets.ModelViewSet):
    queryset = Promocao.objects.all()
    serializer_class = PromocaoSerializer

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoginView(APIView):
    def post(self, request):
        cpf = request.data.get('cpf')
        senha = request.data.get('senha')
        user = authenticate(request, username=cpf, password=senha)
        if user is None:
            return Response(
                {"erro": "Credenciais inválidas"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        login(request, user)
        
        return Response(
            {"mensagem": "Login realizado com sucesso.",
            "gerente": {
                "id" : user.id,
                "nome" : user.nome,
                },
            }, 
            status=status.HTTP_200_OK
        )
