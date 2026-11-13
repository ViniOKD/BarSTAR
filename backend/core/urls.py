from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (    ReservaViewSet, health, PedidoViewSet, CategoriaViewSet, GerenteViewSet,
    GarcomViewSet, MesaViewSet, CozinhaViewSet, ItemViewSet,
    ItensPedidoViewSet, AbrirComandaView, ItensPromocaoViewSet,
    PromocaoViewSet, ConsultarComandaView, EnviarPedidoView,
    SolicitacaoViewSet, LoginView, LogoutView, LoginGarcomView, ComandasGarcomView,
)

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'garcons', GarcomViewSet, basename='garcom')
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
    path("logout/", LogoutView.as_view(), name='logout'),
    path('mesas/<int:id_mesa>/abrir-comanda/', AbrirComandaView.as_view(), name='abrir-comanda'),
    path('mesas/<int:id_mesa>/comanda/',ConsultarComandaView.as_view(),name='consultar-comanda'),
    path('enviar-pedido/', EnviarPedidoView.as_view(), name='enviar-pedido'),
    path("login/garcom/", LoginGarcomView.as_view(), name="login-garcom"),
    path("garcom/comandas/", ComandasGarcomView.as_view(), name="comandas-garcom"),
    path('', include(router.urls))
]