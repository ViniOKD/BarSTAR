import datetime as dt

from django.db.migrations.loader import MigrationLoader
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Categoria, Comanda, Cozinha, Funcionario, Gerente, Item, ItensPedido, Mesa, Pedido, Reserva, Solicitacao


class MigrationTests(SimpleTestCase):
    def test_migrations_have_no_conflicting_branches(self):
        self.assertEqual(MigrationLoader(None).detect_conflicts(), {})


class NumeroMesaTests(TestCase):
    def setUp(self):
        self.gerente = Gerente.objects.create_user(
            cpf="11111111111", password="senha", nome="Gerente", tel="44999990000", salario=0,
        )
        self.garcom = Funcionario.objects.create(
            nome="Garçom", tel="44999990001", cpf="22222222222", salario=0,
            cargo=Funcionario.Cargo.GARCOM, gerente=self.gerente,
        )
        self.cliente = APIClient()
        self.cliente.force_authenticate(self.gerente)

    def criar_mesa(self, numero):
        return Mesa.objects.create(
            numero_mesa=numero, capacidade=4, gerente=self.gerente, garcom=self.garcom,
        )

    def dados(self, numero):
        return {"numero_mesa": numero, "capacidade": 4, "status": "LIVRE", "garcom_id": self.garcom.id}

    def test_gerente_escolhe_o_numero_ao_criar(self):
        resposta = self.cliente.post("/api/mesas/", self.dados(12), format="json")

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data["numero_mesa"], 12)

    def test_numero_repetido_e_recusado(self):
        self.criar_mesa(105)

        resposta = self.cliente.post("/api/mesas/", self.dados(105), format="json")

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data["numero_mesa"], ["Já existe uma mesa com o número 105."])

    def test_numero_zero_e_recusado(self):
        resposta = self.cliente.post("/api/mesas/", self.dados(0), format="json")

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("numero_mesa", resposta.data)

    def test_editar_mantendo_o_proprio_numero(self):
        mesa = self.criar_mesa(105)

        resposta = self.cliente.put(f"/api/mesas/{mesa.id}/", {**self.dados(105), "capacidade": 6}, format="json")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["capacidade"], 6)

    def test_rotas_continuam_usando_o_id(self):
        mesa = self.criar_mesa(30)

        resposta = self.client.get(f"/api/mesas/{mesa.id}/comanda/")

        # Sem comanda ativa, mas o tablet já recebe o número da mesa.
        self.assertEqual(resposta.status_code, 404)
        self.assertEqual(resposta.json()["numero_mesa"], 30)

    def test_tablet_troca_o_numero_pelo_id(self):
        mesa = self.criar_mesa(40)

        resposta = self.client.get("/api/mesas/numero/40/")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json(), {"id": mesa.id, "numero_mesa": 40})

    def test_tablet_com_numero_inexistente(self):
        resposta = self.client.get("/api/mesas/numero/999/")

        self.assertEqual(resposta.status_code, 404)
        self.assertEqual(resposta.json()["erro"], "Não existe mesa com o número 999.")

    def test_historico_filtra_pelo_numero(self):
        mesa = self.criar_mesa(30)
        Comanda.objects.create(cpf="52998224725", telefone="44999990002", mesa=mesa, ativa=False)

        resposta = self.cliente.get("/api/historico/comandas/", {"mesa": 30})

        self.assertEqual(len(resposta.data), 1)
        self.assertEqual(resposta.data[0]["mesa_numero"], 30)



class ComportamentoDasViewsTests(TestCase):
    # Fixam as respostas das views antes de mover as regras para a camada de serviços.
    def setUp(self):
        self.gerente = Gerente.objects.create_user(
            cpf="11111111111", password="senha", nome="Gerente", tel="44999990000", salario=0,
        )
        self.garcom = Funcionario.objects.create(
            nome="Garçom", tel="44999990001", cpf="22222222222", salario=0,
            cargo=Funcionario.Cargo.GARCOM, gerente=self.gerente,
        )
        self.mesa = self.criar_mesa(60)
        self.gerencia = APIClient()
        self.gerencia.force_authenticate(self.gerente)
        self.tablet = APIClient()

    def criar_mesa(self, numero, **extra):
        return Mesa.objects.create(
            numero_mesa=numero, capacidade=4, gerente=self.gerente, garcom=self.garcom, **extra,
        )

    def criar_comanda(self, mesa=None, **extra):
        return Comanda.objects.create(
            cpf="52998224725", telefone="44999990002", mesa=mesa or self.mesa, **extra,
        )

    def abrir(self, mesa_id):
        return self.tablet.post(
            f"/api/mesas/{mesa_id}/abrir-comanda/",
            {"cpf": "529.982.247-25", "telefone": "(44) 99999-0002"},
            format="json",
        )

    # Abertura e consulta de comanda

    def test_abrir_comanda(self):
        resposta = self.abrir(self.mesa.id)

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data["numero_mesa"], 60)
        self.assertTrue(Comanda.objects.filter(pk=resposta.data["id_comanda"], ativa=True).exists())

    def test_abrir_comanda_mesa_inexistente(self):
        resposta = self.abrir(999999)

        self.assertEqual(resposta.status_code, 404)
        self.assertEqual(resposta.data["erro"], "Mesa informada não existe no sistema.")

    def test_abrir_comanda_cpf_invalido(self):
        resposta = self.tablet.post(
            f"/api/mesas/{self.mesa.id}/abrir-comanda/",
            {"cpf": "123", "telefone": "44999990002"},
            format="json",
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("cpf", resposta.data)

    def test_abrir_comanda_mesa_inativa(self):
        mesa = self.criar_mesa(61, status=Mesa.Status.INATIVA)

        resposta = self.abrir(mesa.id)

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data["erro"], "Mesa não está ativa e não pode receber novas comandas.")

    def test_abrir_comanda_mesa_ocupada(self):
        self.criar_comanda()

        resposta = self.abrir(self.mesa.id)

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("já possui uma comanda em andamento", resposta.data["erro"])

    def test_consultar_comanda_ativa(self):
        comanda = self.criar_comanda()

        resposta = self.tablet.get(f"/api/mesas/{self.mesa.id}/comanda/")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["id"], comanda.id)
        self.assertEqual(resposta.data["numero_mesa"], 60)

    def test_consultar_comanda_mesa_inexistente(self):
        resposta = self.tablet.get("/api/mesas/999999/comanda/")

        self.assertEqual(resposta.status_code, 404)
        self.assertEqual(resposta.data["erro"], "Mesa informada não existe no sistema.")

    # Solicitações

    def solicitar(self, comanda, tipo="FECHAMENTO"):
        return self.tablet.post("/api/solicitacoes/", {"comanda": comanda.id, "tipo": tipo}, format="json")

    def test_criar_solicitacao(self):
        comanda = self.criar_comanda()

        resposta = self.solicitar(comanda)

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data["status"], "PENDENTE")
        self.assertEqual(resposta.data["numero_mesa"], 60)

    def test_criar_solicitacao_sem_comanda(self):
        resposta = self.tablet.post("/api/solicitacoes/", {"tipo": "FECHAMENTO"}, format="json")

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data["erro"], "Informe o ID da comanda.")

    def test_fechamento_duplicado(self):
        comanda = self.criar_comanda()
        self.solicitar(comanda)

        resposta = self.solicitar(comanda)

        self.assertEqual(resposta.status_code, 409)
        self.assertEqual(resposta.data["erro"], "Já existe uma solicitação de fechamento pendente para esta comanda.")

    def test_atendimento_pode_repetir(self):
        comanda = self.criar_comanda()
        self.solicitar(comanda, "ATENDIMENTO")

        resposta = self.solicitar(comanda, "ATENDIMENTO")

        self.assertEqual(resposta.status_code, 201)

    def test_atender_solicitacao(self):
        solicitacao = Solicitacao.objects.create(comanda=self.criar_comanda(), tipo="ATENDIMENTO")

        resposta = self.gerencia.patch(f"/api/solicitacoes/{solicitacao.id}/atender/")
        repetida = self.gerencia.patch(f"/api/solicitacoes/{solicitacao.id}/atender/")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["status"], "ATENDIDA")
        self.assertEqual(repetida.status_code, 400)
        self.assertEqual(repetida.data["erro"], "Apenas solicitações pendentes podem ser atendidas.")

    # Mesas

    def test_excluir_mesa_com_comanda_ativa(self):
        self.criar_comanda()

        resposta = self.gerencia.delete(f"/api/mesas/{self.mesa.id}/")

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("possui uma comanda ativa", resposta.data["erro"])

    def test_excluir_mesa_livre(self):
        mesa = self.criar_mesa(62)

        resposta = self.gerencia.delete(f"/api/mesas/{mesa.id}/")

        self.assertEqual(resposta.status_code, 204)
        self.assertFalse(Mesa.objects.filter(pk=mesa.id).exists())

    def test_inativar_mesa_com_comanda_ativa(self):
        self.criar_comanda()

        resposta = self.gerencia.put(
            f"/api/mesas/{self.mesa.id}/",
            {"numero_mesa": 60, "capacidade": 4, "status": "INATIVA", "garcom_id": self.garcom.id},
            format="json",
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("possui uma comanda ativa", resposta.data["erro"])

    def dados_reserva(self, dias=1):
        return {
            "cliente_nome": "Cliente",
            "cliente_telefone": "44999990005",
            "data_reserva": (timezone.localdate() + dt.timedelta(days=dias)).isoformat(),
            "hora_reserva": "23:59",
        }

    def test_reservar_mesa(self):
        resposta = self.gerencia.post(f"/api/mesas/{self.mesa.id}/reservar/", self.dados_reserva(), format="json")

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data["mensagem"], "Reserva criada com sucesso!")
        self.assertTrue(Reserva.objects.filter(mesa=self.mesa).exists())

    def test_reservar_mesa_inativa(self):
        mesa = self.criar_mesa(63, status=Mesa.Status.INATIVA)

        resposta = self.gerencia.post(f"/api/mesas/{mesa.id}/reservar/", self.dados_reserva(), format="json")

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data["erro"], "Não é possível reservar. A mesa está com status INATIVA.")

    def test_reservar_mesa_agrupada_hoje(self):
        filha = self.criar_mesa(64, status=Mesa.Status.AGRUPADA, mesa_agrupada=self.mesa)

        resposta = self.gerencia.post(f"/api/mesas/{filha.id}/reservar/", self.dados_reserva(dias=0), format="json")

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(
            resposta.data["erro"],
            "A Mesa #64 está agrupada à Mesa #60. Faça a reserva diretamente na mesa principal.",
        )

    def test_reservar_no_mesmo_dia_duas_vezes(self):
        self.gerencia.post(f"/api/mesas/{self.mesa.id}/reservar/", self.dados_reserva(), format="json")

        resposta = self.gerencia.post(f"/api/mesas/{self.mesa.id}/reservar/", self.dados_reserva(), format="json")

        self.assertEqual(resposta.status_code, 400)

    def test_separar_mesas(self):
        filha = self.criar_mesa(65, status=Mesa.Status.AGRUPADA, mesa_agrupada=self.mesa)

        resposta = self.gerencia.post(f"/api/mesas/{self.mesa.id}/separar/")

        self.assertEqual(resposta.status_code, 200)
        filha.refresh_from_db()
        self.assertIsNone(filha.mesa_agrupada)
        self.assertEqual(filha.status, Mesa.Status.LIVRE)

    def test_separar_mesa_sem_grupo(self):
        resposta = self.gerencia.post(f"/api/mesas/{self.mesa.id}/separar/")

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data["erro"], "Esta mesa não possui outras mesas agrupadas a ela.")

    # Histórico

    def test_historico_filtra_por_garcom_e_data(self):
        self.criar_comanda(ativa=False)
        hoje = timezone.localdate().isoformat()

        resposta = self.gerencia.get(
            "/api/historico/comandas/", {"garcom": "", "data_inicio": hoje, "data_fim": hoje},
        )
        vazia = self.gerencia.get("/api/historico/comandas/", {"data_fim": "2000-01-01"})

        self.assertEqual(len(resposta.data), 1)
        self.assertEqual(len(vazia.data), 0)


class TratamentoDeErrosTests(TestCase):
    def setUp(self):
        self.gerente = Gerente.objects.create_user(
            cpf="11111111111", password="senha", nome="Gerente", tel="44999990000", salario=0,
        )
        garcom = Funcionario.objects.create(
            nome="Garçom", tel="44999990001", cpf="22222222222", salario=0,
            cargo=Funcionario.Cargo.GARCOM, gerente=self.gerente,
        )
        self.mesa = Mesa.objects.create(numero_mesa=70, capacidade=4, gerente=self.gerente, garcom=garcom)
        self.gerencia = APIClient()
        self.gerencia.force_authenticate(self.gerente)

    def test_cancelar_reserva(self):
        reserva = Reserva.objects.create(
            mesa=self.mesa, cliente_nome="Cliente",
            data_reserva=timezone.localdate() + dt.timedelta(days=1), hora_reserva="20:00",
        )

        resposta = self.gerencia.delete(f"/api/reservas/{reserva.id}/")

        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(Reserva.objects.filter(pk=reserva.id).exists())

    def test_cancelar_reserva_inexistente(self):
        resposta = self.gerencia.delete("/api/reservas/999999/")

        self.assertEqual(resposta.status_code, 404)
        self.assertEqual(resposta.data["erro"], "Reserva não encontrada ou já removida.")

    def criar_item(self):
        categoria = Categoria.objects.create(nome="Categoria de teste", tipo_categoria=Categoria.TipoCategoria.PRATO)
        item = Item.objects.create(
            nome="Item de teste", preco_unitario="10.00", peso=300, tempo_preparo_minutos=15, categoria=categoria, gerente=self.gerente,
        )
        return categoria, item

    def test_categoria_com_produtos_nao_muda_de_tipo(self):
        categoria, _ = self.criar_item()

        resposta = self.gerencia.patch(
            f"/api/categorias/{categoria.id}/", {"tipo_categoria": Categoria.TipoCategoria.BEBIDA}, format="json",
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("existem produtos vinculados", resposta.data["detail"])

    def test_produto_com_pedido_nao_e_excluido(self):
        _, item = self.criar_item()
        comanda = Comanda.objects.create(cpf="52998224725", telefone="44999990002", mesa=self.mesa)
        pedido = Pedido.objects.create(comanda=comanda, cozinha=Cozinha.objects.first())
        ItensPedido.objects.create(item=item, pedido=pedido, preco="10.00", quantidade=1)

        resposta = self.gerencia.delete(f"/api/itens/{item.id}/")

        self.assertEqual(resposta.status_code, 409)
        self.assertIn("vínculos que impedem sua exclusão", resposta.data["detail"])
