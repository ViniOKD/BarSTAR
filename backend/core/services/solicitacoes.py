from django.db import transaction
from rest_framework.exceptions import APIException, ValidationError

from core.models import Comanda, Solicitacao

# Fachada das solicitações que o cliente faz pelo tablet e o garçom atende.


class FechamentoJaSolicitado(APIException):
    status_code = 409
    default_detail = {"erro": "Já existe uma solicitação de fechamento pendente para esta comanda."}


@transaction.atomic
def criar_solicitacao(*, comanda_id, tipo):
    # Bloqueia a comanda durante a verificação e a criação.
    comanda = Comanda.objects.select_for_update().filter(pk=comanda_id, ativa=True).first()
    if comanda is None:
        raise ValidationError({"erro": "Comanda não encontrada ou inativa."})

    # Só pode haver um pedido de fechamento pendente por comanda.
    if tipo == Solicitacao.TipoSolicitacao.FECHAMENTO:
        fechamento_pendente = Solicitacao.objects.filter(
            comanda=comanda,
            tipo=Solicitacao.TipoSolicitacao.FECHAMENTO,
            status=Solicitacao.StatusSolicitacao.PENDENTE,
        ).exists()
        if fechamento_pendente:
            raise FechamentoJaSolicitado()

    return Solicitacao.objects.create(comanda=comanda, tipo=tipo)


def atender_solicitacao(solicitacao):
    if solicitacao.status != Solicitacao.StatusSolicitacao.PENDENTE:
        raise ValidationError({"erro": "Apenas solicitações pendentes podem ser atendidas."})

    solicitacao.status = Solicitacao.StatusSolicitacao.ATENDIDA
    solicitacao.save(update_fields=["status"])
    return solicitacao
