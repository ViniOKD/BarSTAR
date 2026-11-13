from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Funcionario, Gerente

GERENTE = "GERENTE"

# O que cada cargo pode fazer. O gerente pode tudo, por isso não aparece aqui.
PERMISSOES_POR_CARGO = {
    Funcionario.Cargo.GARCOM: {
        "ver_pedidos",
        "confirmar_entrega",
        "ver_solicitacoes",
        "atender_solicitacoes",
    },
    Funcionario.Cargo.COZINHA: {
        "ver_pedidos",
        "atualizar_preparo",
    },
    Funcionario.Cargo.BAR: {
        "ver_pedidos",
        "atualizar_preparo",
    },
}

# Usado nas views para marcar um método que não exige login (ex.: tablet do cliente).
SEM_LOGIN = "sem_login"


def cargo_de(usuario):
    # Retorna o cargo de quem está logado, ou None se não houver login.
    if isinstance(usuario, Gerente):
        return GERENTE

    if isinstance(usuario, Funcionario):
        return usuario.cargo

    return None


def tem_permissao(usuario, permissao):
    cargo = cargo_de(usuario)

    if cargo == GERENTE:
        return True

    return permissao in PERMISSOES_POR_CARGO.get(cargo, set())


class SomenteGerente(BasePermission):
    message = "Acesso restrito ao gerente."

    def has_permission(self, request, view):
        return cargo_de(request.user) == GERENTE


class GerenteOuLeitura(BasePermission):
    # Qualquer um pode consultar (ex.: cardápio no tablet); só o gerente altera.
    message = "Acesso restrito ao gerente."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return cargo_de(request.user) == GERENTE


class PermissaoDoCargo(BasePermission):
    # A view informa a permissão exigida em cada método:
    #     permissoes_por_metodo = {"GET": "ver_pedidos", "PATCH": "atualizar_preparo"}
    # Um método que não estiver no dicionário é negado.
    message = "Seu cargo não tem permissão para esta ação."

    def has_permission(self, request, view):
        metodo = "GET" if request.method == "HEAD" else request.method
        permissao = view.permissoes_por_metodo.get(metodo)

        if permissao is None:
            return False

        if permissao == SEM_LOGIN:
            return True

        return tem_permissao(request.user, permissao)
