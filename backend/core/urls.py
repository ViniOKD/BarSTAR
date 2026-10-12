from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    health, PedidoViewSet, CategoriaViewSet, GerenteViewSet, GarcomViewSet,
    MesaViewSet, CozinhaViewSet, ItemViewSet, ItensPedidoViewSet, AbrirComandaView,
    ItensPromocaoViewSet, PromocaoViewSet)

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'gerentes', GerenteViewSet, basename='gerente')
router.register(r'garcons', GarcomViewSet, basename='garcom')
router.register(r'mesas', MesaViewSet, basename='mesa')
router.register(r'cozinhas', CozinhaViewSet, basename='cozinha')
router.register(r'itens', ItemViewSet, basename='item')
router.register(r'itens-pedido', ItensPedidoViewSet, basename='itens-pedido')
router.register(r'itens-promocao', ItensPromocaoViewSet, basename='itens-promocao')
router.register(r'promocoes', PromocaoViewSet, basename='promocao')


urlpatterns = [
    path("health/", health, name="health"),
    path('mesas/<int:id_mesa>/abrir-comanda/', AbrirComandaView.as_view(), name='abrir-comanda'),
    path('', include(router.urls))
]
