import re
from rest_framework import serializers
from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda
)

# Os serializers convertem dados do banco de dados para formato JSON


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class GerenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gerente
        fields = '__all__'


class GarcomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Garcom
        fields = '__all__'

class MesaSerializer(serializers.ModelSerializer):
    garcom = GarcomSerializer(read_only=True)
    class Meta:
        model = Mesa
        fields = '__all__'

class CozinhaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cozinha
        fields = '__all__'

class ItemSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    class Meta:
        model = Item
        fields = '__all__'

class ItensPedidoSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    class Meta:
        model = ItensPedido
        fields = ['id', 'item', 'preco', 'quantidade'] 


class ItensPromocaoSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    class Meta:
        model = ItensPromocao
        fields = '__all__'

class PromocaoSerializer(serializers.ModelSerializer):
    itens_promocao = ItensPromocaoSerializer(many=True,read_only=True)
    class Meta:
        model = Promocao
        fields = '__all__'

class PedidoSerializer(serializers.ModelSerializer):
    mesa = MesaSerializer(read_only=True)
    cozinha = CozinhaSerializer(read_only=True)
    itens_pedido = ItensPedidoSerializer(many=True,read_only=True)
    class Meta:
        model = Pedido
        fields = '__all__'

class AbrirComandaSerializer(serializers.Serializer):
    cpf = serializers.CharField(max_length=14)
    telefone = serializers.CharField(max_length=15)
    id_mesa = serializers.IntegerField( required=True, error_messages={'required': 'A identificação da mesa é obrigatória.'})

    # Validação do CPF
    def validate_cpf(self, value):
        cpf_numeros = re.sub(r'\D', '', value)
        if len(cpf_numeros) != 11:
            raise serializers.ValidationError("O CPF informado é inválido. Digite os 11 dígitos.")
        return cpf_numeros

    # Validação do Telefone
    def validate_telefone(self, value):
        tel_numeros = re.sub(r'\D', '', value)
        if len(tel_numeros) < 10:
            raise serializers.ValidationError("O número de telefone informado é inválido. Inclua o DDD.")
        return tel_numeros