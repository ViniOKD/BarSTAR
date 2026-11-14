from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import rotate_token
from rest_framework.authentication import SessionAuthentication

from .models import Funcionario

# Nome usado para guardar na sessão o funcionário que fez login.
CHAVE_SESSAO = "funcionario_id"


class AutenticacaoFuncionario(SessionAuthentication):
    """Descobre quem está logado: o gerente (login do Django) ou um funcionário."""

    def authenticate(self, request):
        # O gerente usa o login padrão do Django.
        gerente = super().authenticate(request)
        if gerente is not None:
            return gerente

        funcionario = funcionario_da_sessao(request)
        if funcionario is None:
            return None

        # Mesma proteção contra CSRF aplicada ao gerente.
        self.enforce_csrf(request)
        return (funcionario, None)


def funcionario_da_sessao(request):
    funcionario_id = request.session.get(CHAVE_SESSAO)
    if funcionario_id is None:
        return None

    # Quem foi inativado perde o acesso mesmo com a sessão ainda aberta.
    return Funcionario.objects.filter(pk=funcionario_id, ativo=True).first()


def entrar_como_gerente(request, cpf, senha):
    # Retorna o gerente se o CPF e a senha estiverem corretos, ou None.
    gerente = authenticate(request, username=cpf, password=senha)
    if gerente is None:
        return None

    # Encerra qualquer sessão anterior antes de abrir a nova.
    logout(request)
    login(request, gerente)
    return gerente


def buscar_funcionario(cpf, senha):
    # Retorna o funcionário se o CPF e a senha estiverem corretos, ou None.
    funcionario = Funcionario.objects.filter(cpf=cpf).first()
    if funcionario is None or not funcionario.conferir_senha(senha):
        return None

    return funcionario


def entrar_como_funcionario(request, funcionario):
    # logout cria uma sessão nova, para não reaproveitar a anterior.
    logout(request)
    request.session[CHAVE_SESSAO] = funcionario.pk
    # Gera o token CSRF que o navegador envia nas próximas alterações.
    rotate_token(request)
