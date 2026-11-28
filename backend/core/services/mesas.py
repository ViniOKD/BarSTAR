import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.models import Mesa

# A mesa aparece como reservada de 2h antes até 2h depois do horário marcado.
JANELA_RESERVA = datetime.timedelta(hours=2)

# O cliente da reserva pode abrir a comanda até 30 minutos antes do horário.
TOLERANCIA_ABERTURA = datetime.timedelta(minutes=30)


def inicio_da_reserva(reserva):
    # Junta a data e a hora da reserva no fuso horário do bar.
    return timezone.make_aware(
        datetime.datetime.combine(reserva.data_reserva, reserva.hora_reserva)
    )


def reserva_em_andamento(mesa, agora=None):
    # Retorna a reserva de hoje cuja janela inclui o horário atual, ou None.
    if agora is None:
        agora = timezone.now()

    # localdate usa o fuso do bar; now().date() usaria UTC e viraria o dia às 21h.
    hoje = timezone.localdate(agora)
    reservas = mesa.reservas.filter(ativa=True, data_reserva=hoje).order_by("hora_reserva")

    for reserva in reservas:
        inicio = inicio_da_reserva(reserva)
        if inicio - JANELA_RESERVA <= agora <= inicio + JANELA_RESERVA:
            return reserva

    return None


def tem_comanda_ativa(mesa):
    return mesa.comandas.filter(ativa=True).exists()


def status_atual(mesa):
    # Inativa e agrupada são definidas pelo gerente e valem sempre.
    if mesa.status in (Mesa.Status.INATIVA, Mesa.Status.AGRUPADA):
        return mesa.status

    # A mesa está ocupada enquanto houver uma comanda aberta nela.
    if mesa.status == Mesa.Status.OCUPADA or tem_comanda_ativa(mesa):
        return Mesa.Status.OCUPADA

    if reserva_em_andamento(mesa) is not None:
        return Mesa.Status.RESERVADA

    return Mesa.Status.LIVRE


def erro_de_reserva_na_abertura(mesa, agora=None):
    # Retorna a mensagem de erro se ainda for cedo para abrir a comanda, ou None.
    if agora is None:
        agora = timezone.now()

    reserva = reserva_em_andamento(mesa, agora)
    if reserva is None:
        return None

    horario_permitido = inicio_da_reserva(reserva) - TOLERANCIA_ABERTURA
    if agora >= horario_permitido:
        return None

    return (
        f"Mesa reservada para {reserva.cliente_nome} às {reserva.hora_reserva.strftime('%H:%M')}. "
        f"A comanda só pode ser aberta a partir das {horario_permitido.strftime('%H:%M')}."
    )


def validar_ids_para_juntar(mesa_principal, mesas_ids):
    if not isinstance(mesas_ids, list) or not mesas_ids:
        raise ValidationError({"erro": "Nenhuma mesa selecionada para juntar."})

    for mesa_id in mesas_ids:
        if not isinstance(mesa_id, int):
            raise ValidationError({"erro": "Envie os números das mesas em uma lista."})

    if mesa_principal.id in mesas_ids:
        raise ValidationError({"erro": "Uma mesa não pode ser agrupada a si mesma."})


def validar_mesa_para_juntar(mesa):
    status = status_atual(mesa)
    if status != Mesa.Status.LIVRE:
        raise ValidationError({
            "erro": f"A mesa {mesa.numero_mesa} não pode ser agrupada pois está com status {status}.",
        })

    if mesa.mesas_agrupadas.exists():
        raise ValidationError({
            "erro": f"A mesa {mesa.numero_mesa} já é a principal de outro grupo. Separe-a antes de agrupar.",
        })


@transaction.atomic
def juntar_mesas(mesa_principal, mesas_ids):
    validar_ids_para_juntar(mesa_principal, mesas_ids)

    if mesa_principal.status in (Mesa.Status.INATIVA, Mesa.Status.AGRUPADA):
        raise ValidationError({
            "erro": f"A mesa {mesa_principal.numero_mesa} não pode ser a principal pois está com status {mesa_principal.status}.",
        })

    # Bloqueia as mesas para que outra requisição não as agrupe ao mesmo tempo.
    mesas = list(Mesa.objects.select_for_update().filter(id__in=mesas_ids))
    if len(mesas) != len(set(mesas_ids)):
        raise ValidationError({"erro": "Uma das mesas selecionadas não existe."})

    for mesa in mesas:
        validar_mesa_para_juntar(mesa)

    Mesa.objects.filter(id__in=mesas_ids).update(
        mesa_agrupada=mesa_principal,
        status=Mesa.Status.AGRUPADA,
    )


@transaction.atomic
def separar_mesas(mesa_principal):
    # Libera as mesas filhas, tirando o vínculo e voltando para LIVRE.
    mesas_filhas = mesa_principal.mesas_agrupadas.select_for_update()
    if not mesas_filhas.exists():
        raise ValidationError({"erro": "Esta mesa não possui outras mesas agrupadas a ela."})

    mesas_filhas.update(mesa_agrupada=None, status=Mesa.Status.LIVRE)


def validar_exclusao(mesa):
    if tem_comanda_ativa(mesa):
        raise ValidationError({
            "erro": "Não é possivel excluir esta mesa pois ela possui uma comanda ativa em andamento.",
        })


def validar_alteracao(mesa, novo_status):
    # Inativar a mesa com cliente sentado deixaria a comanda sem mesa utilizável.
    if novo_status == Mesa.Status.INATIVA and tem_comanda_ativa(mesa):
        raise ValidationError({
            "erro": "Não é possível inativa esta mesa pois ela possui uma comanda ativa.",
        })


def validar_reserva(mesa, data_reserva):
    # Regras da mesa; os dados da reserva são validados pelo ReservaSerializer.
    if mesa.status == Mesa.Status.INATIVA:
        raise ValidationError({
            "erro": f"Não é possível reservar. A mesa está com status {mesa.status}.",
        })

    # localdate usa o fuso do bar; now().date() usaria UTC e viraria o dia às 21h.
    hoje = timezone.localdate().isoformat()
    agrupada = mesa.status == Mesa.Status.AGRUPADA or mesa.mesa_agrupada is not None
    if agrupada and data_reserva == hoje:
        principal = mesa.mesa_agrupada.numero_mesa if mesa.mesa_agrupada else "-"
        raise ValidationError({
            "erro": f"A Mesa #{mesa.numero_mesa} está agrupada à Mesa #{principal}. Faça a reserva diretamente na mesa principal.",
        })
