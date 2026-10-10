from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import health, PedidoViewSet, CategoriaViewSet

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'categorias', CategoriaViewSet, basename='categoria')

urlpatterns = [
    path("health/", health, name="health"),
    path('', include(router.urls))
]