from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .serializers import PedidoSerializer, CategoriaSerializer, AbrirComandaSerializer
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Pedido, Categoria, Comanda, Mesa

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

class AbrirComandaView(APIView):
    def post(self, request):
        serializer = AbrirComandaSerializer(data=request.data)
        
        #Se CPF ou Telefone forem inválidos, retorna erro 400
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        cpf = serializer.validated_data['cpf']
        telefone = serializer.validated_data['telefone']
        id_mesa = serializer.validated_data['id_mesa']

        # Busca a mesa no banco
        try:
            mesa = Mesa.objects.get(id=id_mesa)
        except Mesa.DoesNotExist:
            return Response(
                {"erro": "Mesa informada não existe no sistema."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Verifica se a mesa já possui comanda ativa
        comanda_ativa = Comanda.objects.filter(mesa=mesa, ativa=True).first()
        if comanda_ativa:
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