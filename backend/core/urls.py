from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (    HistoricoComandasView, RecomendacoesClienteView, ReservaViewSet, health, PedidoViewSet, CategoriaViewSet, GerenteViewSet,
    FuncionarioViewSet, MesaViewSet, CozinhaViewSet, ItemViewSet,
    ItensPedidoViewSet, AbrirComandaView, ItensPromocaoViewSet,
    PromocaoViewSet, ConsultarComandaView, EnviarPedidoView,
    SolicitacaoViewSet, LoginView, LogoutView, SessaoView, ComandasGarcomView, DashboardGerenteView,
    RelatorioVendasView, ConfirmarPagamentoView
)

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'funcionarios', FuncionarioViewSet, basename='funcionario')
router.register(r'mesas', MesaViewSet, basename='mesa')
router.register(r'cozinhas', CozinhaViewSet, basename='cozinha')
router.register(r'itens', ItemViewSet, basename='item')
router.register(r'itens-pedido', ItensPedidoViewSet, basename='itens-pedido')
router.register(r'promocoes', PromocaoViewSet, basename='promocao')
router.register(r'solicitacoes', SolicitacaoViewSet, basename='solicitacao')
router.register(r'reservas', ReservaViewSet, basename='reserva')


urlpatterns = [
    path("health/", health, name="health"),
    path("login/", LoginView.as_view(), name='login'),
    path("sessao/", SessaoView.as_view(), name='sessao'),
    path("logout/", LogoutView.as_view(), name='logout'),
    path('mesas/<int:id_mesa>/abrir-comanda/', AbrirComandaView.as_view(), name='abrir-comanda'),
    path('mesas/<int:id_mesa>/comanda/',ConsultarComandaView.as_view(),name='consultar-comanda'),
    path('enviar-pedido/', EnviarPedidoView.as_view(), name='enviar-pedido'),
    path('mesas/<int:id_mesa>/comanda/confirmar-pagamento/',ConfirmarPagamentoView.as_view(),name= 'confirmar-pagamento'),
    path("garcom/comandas/", ComandasGarcomView.as_view(), name="comandas-garcom"),
    path("gerente/dashboard/", DashboardGerenteView.as_view(), name="dashboard-gerente"),
    path("gerente/relatorio-vendas/", RelatorioVendasView.as_view(), name="relatorio-vendas"),
    path('historico/comandas/', HistoricoComandasView.as_view(), name="historico-comandas"),
    path("recomendacoes/", RecomendacoesClienteView.as_view(), name="recomendacoes-cliente"),
    path('', include(router.urls))
]
