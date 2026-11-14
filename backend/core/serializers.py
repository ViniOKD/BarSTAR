from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import (
    Gerente, Funcionario, Mesa, Cozinha, Categoria, Item, Pedido, ItensPedido, Promocao, ItensPromocao, Comanda, Solicitacao, Reserva)
from decimal import Decimal
import phonenumbers
from django.db.models import Q
import datetime
from datetime import timedelta
from django.db.models import prefetch_related_objects
from django.utils import timezone
from .services.promocoes import salvar_promocao
from .services.dar_preco import obter_precos_atuais
from .services.mesas import status_atual
from .permissoes import tem_permissao
from .validadores import validar_cpf, validar_telefone
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as ErroDeValidacaoDjango
from rest_framework.exceptions import PermissionDenied
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
                'validators': [
                    UniqueValidator(
                        queryset=Categoria.objects.all(),
                        message="Já existe uma categoria cadastrada com este nome.",
                    ),
                ],
            }
        }

class GerenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gerente
        fields = '__all__'


class FuncionarioSerializer(serializers.ModelSerializer):
    # A senha só entra; nunca é devolvida pela API.
    senha = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = Funcionario
        fields = ['id', 'nome', 'cpf', 'tel', 'salario', 'cargo', 'ativo', 'senha', 'data_efetivacao']
        # Ativar e inativar têm rotas próprias.
        read_only_fields = ['id', 'ativo', 'data_efetivacao']
        extra_kwargs = {
            # A repetição de CPF e telefone é conferida abaixo, com mensagens próprias.
            'cpf': {'validators': []},
            'tel': {'validators': []},
            'salario': {'min_value': Decimal("0")},
        }

    def validate_cpf(self, value):
        cpf = validar_cpf(value)

        # O CPF é o login do funcionário, então não muda depois do cadastro.
        if self.instance is not None and cpf != self.instance.cpf:
            raise serializers.ValidationError("O CPF não pode ser alterado.")

        if self.outros_funcionarios().filter(cpf=cpf).exists():
            raise serializers.ValidationError("Já existe um funcionário com este CPF.")

        # Gerente e funcionário entram pela mesma tela; o CPF não pode se repetir.
        if Gerente.objects.filter(cpf=cpf).exists():
            raise serializers.ValidationError("Este CPF já pertence a um gerente.")

        return cpf

    def validate_tel(self, value):
        telefone = validar_telefone(value)

        if self.outros_funcionarios().filter(tel=telefone).exists():
            raise serializers.ValidationError("Já existe um funcionário com este telefone.")

        return telefone

    def outros_funcionarios(self):
        # Na edição, o próprio funcionário não conta como repetido.
        funcionarios = Funcionario.objects.all()
        if self.instance is not None:
            funcionarios = funcionarios.exclude(pk=self.instance.pk)
        return funcionarios

    def validate_senha(self, value):
        # Usa as regras de senha configuradas no Django (tamanho mínimo, senha comum etc.).
        try:
            validate_password(value)
        except ErroDeValidacaoDjango as erro:
            raise serializers.ValidationError(erro.messages)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('senha'):
            raise serializers.ValidationError({"senha": "Informe uma senha para o funcionário."})

        self.validar_troca_de_cargo(attrs)
        return attrs

    def validar_troca_de_cargo(self, attrs):
        # Um garçom com mesas não pode virar cozinha ou bar: as mesas ficariam sem garçom.
        funcionario = self.instance
        if funcionario is None or 'cargo' not in attrs:
            return

        deixa_de_ser_garcom = (
            funcionario.cargo == Funcionario.Cargo.GARCOM
            and attrs['cargo'] != Funcionario.Cargo.GARCOM
        )
        if deixa_de_ser_garcom and funcionario.mesas.exists():
            raise serializers.ValidationError({
                "cargo": "Este garçom ainda é responsável por mesas. Realoque as mesas antes de mudar o cargo.",
            })

    def create(self, validated_data):
        senha = validated_data.pop('senha')
        funcionario = Funcionario(**validated_data)
        funcionario.definir_senha(senha)
        funcionario.save()
        return funcionario

    def update(self, instance, validated_data):
        # Na edição a senha é opcional: só troca se o gerente informar uma nova.
        senha = validated_data.pop('senha', None)

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)

        if senha:
            instance.definir_senha(senha)

        instance.save()
        return instance


class GarcomDaMesaSerializer(serializers.ModelSerializer):
    # Mostra só o necessário do garçom responsável pela mesa.
    class Meta:
        model = Funcionario
        fields = ['id', 'nome']


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
    garcom = GarcomDaMesaSerializer(read_only=True)
    garcom_id = serializers.PrimaryKeyRelatedField(
            # Só garçons ativos podem ser responsáveis por uma mesa.
            queryset=Funcionario.objects.filter(cargo=Funcionario.Cargo.GARCOM, ativo=True),
            error_messages={"does_not_exist": "Selecione um garçom ativo."},
            source="garcom",
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
        # O gerente da mesa é quem está logado; a view preenche esse campo.
        read_only_fields = ['gerente']

    def get_status_dinamico(self, obj):
        # Considera comanda aberta, agrupamento e reserva próxima do horário.
        return status_atual(obj)

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
            raise serializers.ValidationError({
                "erro": "Envie somente o status do item."
            })

        status_atual = self.instance.status
        novo_status = attrs.get("status")

        transicoes_permitidas = {
            ItensPedido.Status.EM_PREPARO: [
                ItensPedido.Status.PRONTO,
            ],
            ItensPedido.Status.PRONTO: [
                ItensPedido.Status.ENTREGUE,
            ],
            ItensPedido.Status.ENTREGUE: [],
        }

        if novo_status not in transicoes_permitidas[status_atual]:
            raise serializers.ValidationError({
                "status": (
                    f"Não é permitido alterar o status de "
                    f"{status_atual} para {novo_status}."
                )
            })

        # Cozinha e bar marcam como pronto; o garçom confirma a entrega.
        permissao_por_status = {
            ItensPedido.Status.PRONTO: "atualizar_preparo",
            ItensPedido.Status.ENTREGUE: "confirmar_entrega",
        }
        usuario = self.context["request"].user
        if not tem_permissao(usuario, permissao_por_status[novo_status]):
            raise PermissionDenied("Seu cargo não tem permissão para esta mudança de status.")

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

        if round(value, 2) != value:
            raise serializers.ValidationError(
                "Informe o percentual com no máximo duas casas decimais."
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

class MesaDoPedidoSerializer(serializers.ModelSerializer):
    # A lista de pedidos é pública (garçom e cozinha não têm login),
    # então mostra só o número da mesa e o nome do garçom.
    garcom = serializers.CharField(source="garcom.nome", read_only=True)

    class Meta:
        model = Mesa
        fields = ["id", "garcom"]


class PedidoSerializer(serializers.ModelSerializer):
    mesa = MesaDoPedidoSerializer(source='comanda.mesa', read_only=True)
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
    # A mesa vem da URL (/mesas/<id>/abrir-comanda/) e é validada na view.

    def validate_cpf(self, value):
        return validar_cpf(value)

    def validate_telefone(self, value):
        return validar_telefone(value)


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
            "status",
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

class SolicitacaoSerializer(serializers.ModelSerializer):
    comanda = serializers.PrimaryKeyRelatedField(queryset=Comanda.objects.filter(ativa=True))
    mesa = serializers.IntegerField(
        source='comanda.mesa_id',
        read_only=True,
    )
    class Meta:
        model = Solicitacao
        fields = [
            'id',
            'tipo',
            'status',
            'data_solicitacao',
            'comanda',
            'mesa',
        ]
        read_only_fields = [
            'id',
            'status',
            'data_solicitacao',
            'mesa',
        ]

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


class HistoricoComandaSerializer(serializers.ModelSerializer):
    mesa_numero = serializers.IntegerField(source="mesa.id", read_only=True)
    garcom_nome = serializers.CharField(source="garcom.nome", read_only=True, default="Não registrado")
    pedidos = PedidoComandaSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Comanda
        fields = [
            "id", "cpf", "telefone", "mesa_numero", "garcom_nome", 
            "data_abertura", "data_fechamento", "pedidos", "total"
        ]

    def get_total(self, obj):
        total = Decimal("0.00")
        for pedido in obj.pedidos.all():
            for item_pedido in pedido.itens_pedido.all():
                total += item_pedido.preco * item_pedido.quantidade
        return f"{total:.2f}"