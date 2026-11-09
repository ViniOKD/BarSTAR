from django.db import connection, transaction
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.contrib.auth import authenticate, login, logout
from rest_framework import viewsets, status, mixins, viewsets, status

from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from .services.dar_preco import calcular_preco_final
from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda, Solicitacao
)
from .serializers import (
    PedidoSerializer, CategoriaSerializer, GerenteSerializer, GarcomSerializer,
    MesaSerializer, CozinhaSerializer, ItemSerializer, ItensPedidoSerializer,
    ItensPromocaoSerializer, PromocaoSerializer, AbrirComandaSerializer,
    FiltroCardapioSerializer,ComandaConsultaSerializer, ItemCardapioSerializer, EnviarPedidoSerializer, SolicitacaoSerializer)
from .permissions import PermissoesPromocao
from .services.promocoes import (
    bloquear_itens, remover_promocao, validar_alteracao_preco_normal,
)
from .services.dar_preco import obter_precos_atuais
from .services.pedidos import enviar_pedido

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

class PedidoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                    mixins.UpdateModelMixin, viewsets.GenericViewSet):
    
    queryset = Pedido.objects.select_related(
        "comanda__mesa__garcom__gerente", "cozinha",
    ).prefetch_related("itens_pedido__item__categoria")
    serializer_class = PedidoSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    http_method_names = ["get", "patch", "head", "options"]


class ItensPedidoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                        mixins.UpdateModelMixin, viewsets.GenericViewSet):
    
    queryset = ItensPedido.objects.select_related("item__categoria", "pedido")
    serializer_class = ItensPedidoSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    http_method_names = ["get", "patch", "head", "options"]

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
            filtro = FiltroCardapioSerializer(data=query_params.dict())
            filtro.is_valid(raise_exception=True)
            tipo = filtro.validated_data.get('tipo_categoria')
            if tipo:
                categorias = categorias.filter(tipo_categoria=tipo)
            if 'disponivel' in filtro.validated_data:
                categorias = categorias.filter(
                    itens__disponivel=filtro.validated_data['disponivel'],
                ).distinct()
        return categorias

    def destroy(self, request, *args, **kwargs):
        categoria = self.get_object()

        #impede exclusão da categoria com itens vinculados
        if categoria.itens.exists():
            return Response(
                {"erro": "Não é possível excluir esta categoria porque existem produtos vinculados a ela"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Permite exclusão de categoria
        self.perform_destroy(categoria)
        return Response(status=status.HTTP_204_NO_CONTENT)


    def update(self, request, *args, **kwargs):
        categoria = self.get_object()

        novo_tipo = request.data.get('tipo_categoria')

        if novo_tipo is not None and novo_tipo != categoria.tipo_categoria:
            if categoria.itens.exists(): 
                return Response(
                    {"detail": "Não é possível alterar esta categoria porque existem produtos vinculados a ela"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)

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
        serializer = EnviarPedidoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pedidos = enviar_pedido(**serializer.validated_data)

        # monta a lista dos pedidos criados e suas cozinhas.
        dados_pedidos = []
        for pedido in pedidos:
            dados_pedidos.append({
                "id": pedido.pk,
                "cozinha": pedido.cozinha.nome,
            })

        return Response({
            "mensagem": "Pedido enviado para preparo com sucesso!",
            "pedidos": dados_pedidos},
            status=status.HTTP_201_CREATED)
    
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

class PromocaoViewSet(viewsets.ModelViewSet):
    # Consulta somente promoções não removidas e carrega seus itens e categorias.
    queryset = Promocao.objects.filter(
        removida_em__isnull=True,
    ).prefetch_related("itens_promocao__item__categoria")

    serializer_class = PromocaoSerializer
    permission_classes = [PermissoesPromocao]

    def get_serializer_context(self):
        # Acrescenta o horário atual ao contexto padrão do serializer.
        contexto = super().get_serializer_context()
        contexto["agora"] = timezone.now()
        return contexto

    def perform_destroy(self, instance):
        # Executa a remoção lógica por meio da função de serviço.
        remover_promocao(promocao_id=instance.pk)

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related('categoria')
    serializer_class = ItemCardapioSerializer
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
            filtro = FiltroCardapioSerializer(data=query_params.dict())
            filtro.is_valid(raise_exception=True)
            tipo = filtro.validated_data.get('tipo_categoria')
            if tipo:
                itens = itens.filter(categoria__tipo_categoria=tipo)
            if 'disponivel' in filtro.validated_data:
                itens = itens.filter(disponivel=filtro.validated_data['disponivel'])
        return itens

    def update(self, request, *args, **kwargs):
        # Mantém as operações de banco dentro de uma mesma transação.
        with transaction.atomic():
            atual = self.get_object()

            # Bloqueia o item para coordenar alterações concorrentes.
            itens_bloqueados = bloquear_itens([atual.pk])
            item = itens_bloqueados[atual.pk]

            # Permite atualização parcial quando a requisição for PATCH.
            parcial = kwargs.pop("partial", False)

            serializer = self.get_serializer(
                item,
                data=request.data,
                partial=parcial,
            )
            serializer.is_valid(raise_exception=True)

            # Valida o novo preço normal quando ele estiver na atualização.
            if "preco_unitario" in serializer.validated_data:
                novo_preco = serializer.validated_data["preco_unitario"]

                validar_alteracao_preco_normal(
                    item=item,
                    novo_preco=novo_preco,
                )

            # Salva as alterações e retorna os dados atualizados.
            self.perform_update(serializer)
            return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Se a paginação estiver habilitada, obtém os itens da página.
        pagina = self.paginate_queryset(queryset)
        if pagina is not None:
            itens = list(pagina)
        else:
            itens = list(queryset)

        contexto = self.get_serializer_context()
        contexto["precos_atuais"] = obter_precos_atuais(itens)

        serializer = self.get_serializer(
            itens,
            many=True,
            context=contexto,
        )
        if pagina is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)
        
class ItensPromocaoViewSet(viewsets.ModelViewSet):
    queryset = ItensPromocao.objects.all()
    serializer_class = ItensPromocaoSerializer


class SolicitacaoViewSet(viewsets.ModelViewSet):
    queryset = Solicitacao.objects.select_related('comanda__mesa').all()
    serializer_class = SolicitacaoSerializer

    def get_queryset(self):
        #Permite consultar solicitações com determinado status
        solicitacoes = super().get_queryset()
        status_filtro = self.request.query_params.get('status')
        id_mesa = self.request.query_params.get('mesa')

        if status_filtro:
            solicitacoes = solicitacoes.filter(status=status_filtro)

        if id_mesa:
            solicitacoes = solicitacoes.filter(comanda__mesa_id=id_mesa)

        return solicitacoes

    @action(detail=True, methods=['patch'], url_path='atender')
    def atender(self, request, pk=None):
        solicitacao = self.get_object()

        if solicitacao.status != Solicitacao.StatusSolicitacao.PENDENTE:
            return Response(
                {'erro': 'Apenas solicitações pendentes podem ser atendidas.'},
                status=status.HTTP_400_BAD_REQUEST)

        solicitacao.status = Solicitacao.StatusSolicitacao.ATENDIDA
        solicitacao.save()
        serializer = self.get_serializer(solicitacao)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        id_comanda = request.data.get('comanda')

        if not id_comanda:
            return Response(
                {'erro': 'Informe o ID da comanda.'},
                status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                #Bloqueia a comanda durante a verificação e a criação.
                comanda = Comanda.objects.select_for_update().get(
                    pk=id_comanda,
                    ativa=True
                )

                #Verifica se já existe um fechamento pendente.
                if serializer.validated_data.get('tipo') == 'FECHAMENTO':

                    fechamento_pendente = Solicitacao.objects.filter(
                        comanda=comanda,
                        tipo='FECHAMENTO',
                        status='PENDENTE'
                    ).exists()

                    if fechamento_pendente:
                        return Response(
                            {
                                'erro': (
                                    'Já existe uma solicitação de fechamento '
                                    'pendente para esta comanda.'
                                )
                            },
                            status=status.HTTP_409_CONFLICT
                        )
                #cria a solicitação.
                serializer.save(comanda=comanda)
        except (Comanda.DoesNotExist, ValueError, TypeError):
            return Response(
                {'erro': 'Comanda não encontrada ou inativa.'},
                status=status.HTTP_400_BAD_REQUEST)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED)

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