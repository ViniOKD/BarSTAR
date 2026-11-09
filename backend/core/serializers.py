import re
from rest_framework import serializers
from .models import (
    Gerente, Garcom, Mesa, Cozinha, Categoria,
    Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda, Reserva
)
from decimal import Decimal
import phonenumbers
from django.utils import timezone
from django.db.models import Q
import datetime
from datetime import timedelta
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
        extra_kwargs = {
            'nome': {
                'error_messages': {
                    'unique': "Já existe uma categoria cadastrada com este nome."
                }
            }
        }

class GerenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gerente
        fields = '__all__'


class GarcomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Garcom
        fields = '__all__'

class ReservaSerializer(serializers.ModelSerializer):
    mesas_agrupadas_ids = serializers.PrimaryKeyRelatedField(
        queryset=Mesa.objects.all(), 
        many=True, 
        source='mesas_agrupadas', 
        required=False
    )

    class Meta:
        model = Reserva
        fields = ['id', 'mesa','mesas_agrupadas_ids', 'cliente_nome', 'cliente_telefone', 'data_reserva', 'hora_reserva']
        read_only_fields = ['mesa']
        
    def validate(self, data):
        # Monta a data e hora informadas em um objeto datetime completo
        data_reserva = data.get('data_reserva')
        hora_reserva = data.get('hora_reserva')
        
        if data_reserva and hora_reserva:
            # Junta data e hora
            data_hora_informada = datetime.datetime.combine(data_reserva, hora_reserva)
            # Torna a data "aware" (ciente do fuso horário configurado no Django)
            data_hora_informada = timezone.make_aware(data_hora_informada)
            
            # Pega o momento atual
            agora = timezone.now()

            # Validação: A data/hora da reserva não pode ser no passado
            if data_hora_informada < agora:
                raise serializers.ValidationError({"erro": "A data e horário da reserva não podem ser no passado."})


            # Pega a mesa do contexto ou da requisição
            mesa_id = self.context.get('mesa_id')
            if mesa_id:
                # Verifica se já existe reserva para esta mesma mesa no mesmo dia
                conflito = Reserva.objects.filter(
                    mesa_id=mesa_id,
                    ativa=True,
                    data_reserva=data_reserva
                ).exists()

                if conflito:
                    raise serializers.ValidationError({
                        "erro": "Esta mesa já possui uma reserva agendada para este dia."
                    })

        return data
    

class MesaSerializer(serializers.ModelSerializer):
    garcom = GarcomSerializer(read_only=True)
    garcom_id = serializers.PrimaryKeyRelatedField(
            queryset=Garcom.objects.all(),
            source="garcom",
            write_only=True,
        )
    gerente_id = serializers.PrimaryKeyRelatedField(
            queryset=Gerente.objects.all(),
            source="gerente",
            write_only=True,
        )

    reservas = serializers.SerializerMethodField()

    def get_reservas(self, obj):
        # obj é a mesa atual
        # Busca tanto se ela for a principal QUANTO se for uma das filhas agrupadas
        reservas = Reserva.objects.filter(
            Q(mesa=obj) | Q(mesas_agrupadas=obj)
        ).distinct()
        
        return ReservaSerializer(reservas, many=True).data
    

    # Sobrescreve o status para ser calculado dinamicamente
    status_dinamico = serializers.SerializerMethodField()

    # Campos calculados como somente leitura
    capacidade_total = serializers.ReadOnlyField()
    is_principal = serializers.ReadOnlyField()
    
    class Meta:
        model = Mesa
        fields = '__all__'
        read_only_fields = ['gerente', 'gerente_id']

    def get_status_dinamico(self, obj):
        # Se a mesa estiver Inativa ou Ocupada fisicamente agora, mantém
        if obj.status in ['INATIVA', 'OCUPADA']:
            return obj.status

        hoje = timezone.now().date()
        agora = timezone.now()

        # Verifica se existe alguma reserva ativa para HOJE nesta mesa
        reserva_hoje = obj.reservas.filter(ativa=True, data_reserva=hoje).first()

        if reserva_hoje:
            data_hora_reserva = timezone.make_aware(
                datetime.datetime.combine(reserva_hoje.data_reserva, reserva_hoje.hora_reserva)
            )
            # Define a janela do dia: se estiver no dia da reserva (a partir de 2h antes até o horário)
            janela_bloqueio = data_hora_reserva - datetime.timedelta(hours=2)
            
            if janela_bloqueio <= agora <= (data_hora_reserva + datetime.timedelta(hours=2)):
                return 'RESERVADA'

        return 'LIVRE'

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


class ItensPedidoSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    #associa item ao pedido
    item_id = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all(),source='item',write_only=True)

    pedido_id = serializers.PrimaryKeyRelatedField(queryset=Pedido.objects.all(),source='pedido',write_only=True)

    class Meta:
        model = ItensPedido
        fields = ['id','item','item_id','pedido_id','preco','quantidade', 'observacoes', 'status']

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
    mesa_id = serializers.PrimaryKeyRelatedField(
        queryset=Mesa.objects.all(),
        source="mesa"
    )

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

    # Valicao da reserva e do horario 
    def validate(self, attrs):
        mesa = attrs.get('mesa')

        # Só valida se a mesa estiver com status RESERVADA
        if mesa and mesa.status == 'RESERVADA':
            hoje = timezone.now().date()
            agora = timezone.now()

            # Busca a reserva ativa programada para hoje nesta mesa
            reserva = mesa.reservas.filter(ativa=True, data_reserva=hoje).order_by('hora_reserva').first()

            if reserva:
                # Junta data e hora da reserva em um datetime ciente do fuso horário
                data_hora_reserva = timezone.make_aware(
                    datetime.datetime.combine(reserva.data_reserva, reserva.hora_reserva)
                )

                # Tolerância: Permite abrir comanda até 30 minutos antes da reserva
                horario_permitido = data_hora_reserva - datetime.timedelta(minutes=30)

                # Bloqueio caso ainda esteja muito cedo
                if agora < horario_permitido:
                    raise serializers.ValidationError({
                        "erro": f"Mesa reservada para {reserva.cliente_nome} às {reserva.hora_reserva.strftime('%H:%M')}. "
                                f"A comanda só pode ser aberta a partir das {horario_permitido.strftime('%H:%M')}."
                    })

        return attrs
    
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
