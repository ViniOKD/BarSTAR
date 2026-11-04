import re
from rest_framework import serializers
from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda
)
from decimal import Decimal
from django.db.models import prefetch_related_objects
from django.utils import timezone
from .services.promocoes import salvar_promocao
from .services.dar_preco import obter_precos_atuais
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

    def validate_preco_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError('O preço deve ser maior que zero.')
        return value

    def validate(self, attrs):
        categoria = attrs.get('categoria', getattr(self.instance, 'categoria', None))
        if categoria.tipo_categoria == Categoria.TipoCategoria.BEBIDA:
            teor = attrs.get('teor_alcoolico', getattr(self.instance, 'teor_alcoolico', None))
            if teor is None or not 0 <= teor <= 100:
                raise serializers.ValidationError({
                    'teor_alcoolico': 'Informe um teor alcoólico entre 0 e 100%. Use 0 para bebidas sem álcool.',
                })
        else:
            attrs['teor_alcoolico'] = None
        return attrs

class ItemCardapioSerializer(ItemSerializer):
    preco_atual = serializers.SerializerMethodField()
    promocao_atual = serializers.SerializerMethodField()

    def _preco(self, obj):
        # criação de um dicionário de preços se ainda não existir no contexto.
        if "precos_atuais" not in self.context:
            self.context["precos_atuais"] = {}

        precos = self.context["precos_atuais"]

        # consulta o preço somente se ele ainda não estiver no dicionário.
        if obj.pk not in precos:
            precos.update(obter_precos_atuais([obj]))

        return precos[obj.pk]

    def get_preco_atual(self, obj):
        return self._preco(obj)["preco_atual"]

    def get_promocao_atual(self, obj):
        promocao = self._preco(obj)["promocao"]

        if promocao is None:
            return None

        return {
            "id": promocao.pk,
            "nome": promocao.nome,
            "desconto_percentual": promocao.desconto_percentual,
            "data_fim": promocao.data_fim.isoformat(),
        }

class ItensPedidoSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    item_id = serializers.IntegerField(read_only=True)
    pedido_id = serializers.IntegerField(read_only=True)
    nome = serializers.SerializerMethodField()
    desconto_unitario = serializers.SerializerMethodField()

    class Meta:
        model = ItensPedido
        fields = [
            "id", "item", "item_id", "pedido_id", "nome", "preco", "preco_original",
            "desconto_unitario", "promocao_aplicada", "nome_promocao_registrada",
            "quantidade", "observacoes", "status",
        ]
        read_only_fields = [campo for campo in fields if campo != "status"]

    def get_nome(self, obj):
        return obj.nome_item_registrado or obj.item.nome

    def get_desconto_unitario(self, obj):
        if obj.preco_original is None:
            return None
        return f"{obj.preco_original - obj.preco:.2f}"

    def validate(self, attrs):
        if set(self.initial_data) != {"status"}:
            raise serializers.ValidationError({"erro": "Envie somente o status do item."})
        return attrs


class ItensPromocaoSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    class Meta:
        model = ItensPromocao
        fields = '__all__'

class PromocaoSerializer(serializers.ModelSerializer):
    # Recebe uma lista não vazia de IDs dos itens.
    itens = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        write_only=True,
    )

    # Retorna os detalhes dos itens vinculados à promoção.
    itens_promocao = ItensPromocaoSerializer(many=True, read_only=True)

    # Obtém a situação da promoção pelo método get_situacao.
    situacao = serializers.SerializerMethodField()

    class Meta:
        model = Promocao
        fields = [
            "id", "nome", "descricao", "desconto_percentual",
            "data_inicio", "data_fim", "gerente", "situacao",
            "itens", "itens_promocao",
        ]
        read_only_fields = ["id", "gerente", "situacao"]

    def to_internal_value(self, data):
        # Verifica se os dados recebidos são um objeto JSON.
        if not isinstance(data, dict):
            raise serializers.ValidationError("Envie um objeto JSON.")

        # Identifica os campos que o cliente pode enviar.
        permitidos = []
        for nome, campo in self.fields.items():
            if not campo.read_only:
                permitidos.append(nome)

        # Rejeita campos desconhecidos ou definidos como somente leitura.
        erros = {}
        for nome in data:
            if nome not in permitidos:
                erros[nome] = "Campo não permitido."

        if erros:
            raise serializers.ValidationError(erros)

        # Impede que true e false sejam enviados como desconto.
        if isinstance(data.get("desconto_percentual"), bool):
            raise serializers.ValidationError({
                "desconto_percentual": "Informe um número."
            })

        # Executa a conversão e as validações padrão do serializer.
        return super().to_internal_value(data)

    def validate_desconto_percentual(self, value):
        # Aceita somente descontos maiores que 0% e menores que 100%.
        if not 0 < value < 100:
            raise serializers.ValidationError(
                "Informe um percentual maior que zero e menor que 100."
            )
        return value

    def get_situacao(self, obj):
        # Usa o horário recebido no contexto ou o horário atual.
        agora = self.context.get("agora") or timezone.now()

        if agora < obj.data_inicio:
            return "AGENDADA"

        if agora < obj.data_fim:
            return "VIGENTE"

        return "ENCERRADA"

    def create(self, validated_data):
        # Cria a promoção usando a função de serviço.
        promocao = salvar_promocao(
            usuario=self.context["request"].user,
            dados=validated_data,
        )

        # Carrega os itens e suas categorias para evitar consultas repetidas.
        prefetch_related_objects(
            [promocao],
            "itens_promocao__item__categoria",
        )

        return promocao

    def update(self, instance, validated_data):
        # Atualiza a promoção identificada pelo ID da instância.
        promocao = salvar_promocao(
            usuario=self.context["request"].user,
            dados=validated_data,
            promocao_id=instance.pk,
        )

        # Carrega os itens e suas categorias para evitar consultas repetidas.
        prefetch_related_objects(
            [promocao],
            "itens_promocao__item__categoria",
        )

        return promocao

class PedidoSerializer(serializers.ModelSerializer):
    mesa = MesaSerializer(source='comanda.mesa', read_only=True)
    cozinha = CozinhaSerializer(read_only=True)
    itens_pedido = ItensPedidoSerializer(many=True,read_only=True)
    class Meta:
        model = Pedido
        fields = '__all__'
        read_only_fields = ["id", "data_pedido", "comanda"]

    def validate(self, attrs):
        if set(self.initial_data) != {"concluido"}:
            raise serializers.ValidationError({"erro": "Envie somente a conclusão do pedido."})
        return attrs

# valida cada item enviado no pedido
class LinhaPedidoSerializer(serializers.Serializer):
    item_id = serializers.IntegerField(min_value=1, max_value=2**63 - 1)
    quantidade = serializers.IntegerField(min_value=1, max_value=2**31 - 1)
    preco_esperado = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01"),
    )
    observacoes = serializers.CharField(
        allow_blank=True, default="", trim_whitespace=False,
    )

# valida a entrada do envio de pedido: comanda e lista não vazia de itens
class EnviarPedidoSerializer(serializers.Serializer):
    comanda_id = serializers.IntegerField(min_value=1, max_value=2**63 - 1)
    itens = LinhaPedidoSerializer(many=True, allow_empty=False)

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

class ItemComandaSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()
    preco_unitario = serializers.DecimalField(
        source="preco", max_digits=10, decimal_places=2, read_only=True,
    )
    desconto_unitario = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItensPedido
        fields = [
            "id", "nome", "quantidade", "preco_unitario", "preco_original",
            "desconto_unitario", "promocao_aplicada", "nome_promocao_registrada", "subtotal",
        ]
        read_only_fields = fields

    def get_nome(self, obj):
        return obj.nome_item_registrado or obj.item.nome

    def get_desconto_unitario(self, obj):
        if obj.preco_original is None:
            return None
        return f"{obj.preco_original - obj.preco:.2f}"

    def get_subtotal(self, obj):
        return f"{obj.preco * obj.quantidade:.2f}"

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

        return f"{total:.2f}"
