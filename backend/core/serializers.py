import re
from rest_framework import serializers
from .models import Pedido, Categoria, Comanda

class PedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pedido
        fields = '__all__'

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
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