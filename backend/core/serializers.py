import re
from rest_framework import serializers
from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda
)
from decimal import Decimal
import phonenumbers

# Os serializers convertem dados do banco de dados para formato JSON


class FiltroCardapioSerializer(serializers.Serializer):
    disponivel = serializers.BooleanField(required=False)
    tipo_categoria = serializers.ChoiceField(
        choices=Categoria.TipoCategoria.choices, required=False,
    )


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
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        source="categoria",
        write_only=True,
    )

    class Meta:
        model = Item
        fields = "__all__"
        read_only_fields = ['gerente']


class ItensPedidoSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    #associa item ao pedido
    item_id = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all(),source='item',write_only=True)

    pedido_id = serializers.PrimaryKeyRelatedField(queryset=Pedido.objects.all(),source='pedido',write_only=True)

    class Meta:
        model = ItensPedido
        fields = ['id','item','item_id','pedido_id','preco','quantidade', 'status']

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
    mesa = MesaSerializer(source='comanda.mesa', read_only=True)
    cozinha = CozinhaSerializer(read_only=True)
    cozinha_id = serializers.PrimaryKeyRelatedField(queryset=Cozinha.objects.all(),source='cozinha',write_only=True) #associa uma cozinha ao pedido
    itens_pedido = ItensPedidoSerializer(many=True,read_only=True)
    class Meta:
        model = Pedido
        fields = '__all__'

class AbrirComandaSerializer(serializers.Serializer):
    cpf = serializers.CharField(max_length=14)
    telefone = serializers.CharField(max_length=15)

    # Validação do CPF
    def validate_cpf(self, value):
        cpf_numeros = re.sub(r'\D', '', value)
        if len(cpf_numeros) != 11:
            raise serializers.ValidationError("O CPF informado é inválido. Digite os 11 dígitos.")
        if cpf_numeros == cpf_numeros[0] * 11:
            raise serializers.ValidationError("O CPF informado é inválido.")

        digitos = [int(d) for d in cpf_numeros]

        soma_d1 = sum(digitos[i] * (10 - i) for i in range(9))
        resto_d1 = soma_d1 % 11
        d1_esperado = 0 if resto_d1 < 2 else 11 - resto_d1
        if digitos[9] != d1_esperado:
            raise serializers.ValidationError("O CPF informado é inválido.")

        soma_d2 = sum(digitos[i] * (11 - i) for i in range(10))
        resto_d2 = soma_d2 % 11
        d2_esperado = 0 if resto_d2 < 2 else 11 - resto_d2
        if digitos[10] != d2_esperado:
            raise serializers.ValidationError("O CPF informado é inválido.")

        return cpf_numeros

    # Validação do Telefone
    def validate_telefone(self, value):
        tel_numeros = re.sub(r'\D', '', value)
        if len(tel_numeros) < 10:
            raise serializers.ValidationError("O número de telefone informado é inválido. Inclua o DDD.")
        return tel_numeros

class ItemComandaSerializer(serializers.ModelSerializer): #estrutura itens e calcula o subtotal
    nome = serializers.CharField(source="item.nome", read_only=True)
    preco_unitario = serializers.DecimalField(source="preco",max_digits=10,decimal_places=2,read_only=True,)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItensPedido
        fields = ["id", "nome", "quantidade", "preco_unitario", "subtotal"]

    def get_subtotal(self, obj):
        return obj.preco * obj.quantidade


class PedidoComandaSerializer(serializers.ModelSerializer): #junta os itens de cada pedido
    itens = ItemComandaSerializer(source="itens_pedido",many=True,read_only=True,)
    class Meta:
        model = Pedido
        fields = ["id", "data_pedido", "concluido", "itens"]


class ComandaConsultaSerializer(serializers.ModelSerializer):
    mesa = serializers.IntegerField(source="mesa_id", read_only=True)
    pedidos = PedidoComandaSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    class Meta:
        model = Comanda
        fields = ["id", "mesa", "pedidos", "total"]

    def get_total(self, obj):
        total = Decimal("0.00")

        for pedido in obj.pedidos.all():
            for item_pedido in pedido.itens_pedido.all():
                total += item_pedido.preco * item_pedido.quantidade

        return total
        try:
            parsed = phonenumbers.parse(value, 'BR')
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("O número de telefone informado é inválido.")
        if not phonenumbers.is_valid_number(parsed):
            raise serializers.ValidationError("O número de telefone informado é inválido.")
        return value
