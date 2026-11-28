from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from core.models import Comanda, Mesa
from .mesas import erro_de_reserva_na_abertura, tem_comanda_ativa

# Fachada das comandas: as views chamam estas funções e não precisam saber
# de bloqueios, transações ou das regras de mesa e reserva.

MESA_INEXISTENTE = "Mesa informada não existe no sistema."


@transaction.atomic
def abrir_comanda(*, id_mesa, cpf, telefone):
    # Bloqueia a mesa até terminar a abertura, evitando comandas simultâneas.
    mesa = Mesa.objects.select_for_update().filter(id=id_mesa).first()
    if mesa is None:
        raise NotFound({"erro": MESA_INEXISTENTE})

    if mesa.status == Mesa.Status.INATIVA:
        raise ValidationError({"erro": "Mesa não está ativa e não pode receber novas comandas."})

    if mesa.status == Mesa.Status.OCUPADA or tem_comanda_ativa(mesa):
        raise ValidationError({
            "erro": "Esta mesa já possui uma comanda em andamento. Procure o garçom para fechar a comanda atual.",
        })

    # Perto do horário de uma reserva, só libera a partir da tolerância.
    erro_reserva = erro_de_reserva_na_abertura(mesa)
    if erro_reserva:
        raise ValidationError({"erro": erro_reserva})

    return Comanda.objects.create(cpf=cpf, telefone=telefone, mesa=mesa, ativa=True)


def buscar_comanda_ativa(*, id_mesa):
    # Devolve a mesa e a comanda ativa dela (ou None, se não houver).
    mesa = Mesa.objects.filter(id=id_mesa).first()
    if mesa is None:
        raise NotFound({"erro": MESA_INEXISTENTE})

    comanda = (
        Comanda.objects
        .filter(mesa=mesa, ativa=True)
        .select_related("mesa")
        .prefetch_related("pedidos__itens_pedido__item")
        .order_by("-data_abertura")
        .first()
    )
    return mesa, comanda


def filtrar_historico(*, data_inicio=None, data_fim=None, numero_mesa=None, garcom=None):
    # Comandas do histórico do gerente, da abertura mais recente para a mais antiga.
    comandas = Comanda.objects.all()

    if data_inicio:
        comandas = comandas.filter(data_abertura__gte=data_inicio)

    if data_fim:
        # TODO: filtrar por data_fechamento quando o fechamento da comanda existir.
        comandas = comandas.filter(data_abertura__lte=f"{data_fim} 23:59:59")

    if numero_mesa:
        # O gerente filtra pelo número que vê na tela, não pelo id interno.
        comandas = comandas.filter(mesa__numero_mesa=numero_mesa)

    if garcom:
        comandas = comandas.filter(garcom__nome__icontains=garcom)

    return comandas.order_by("-data_abertura")
