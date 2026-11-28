from django.db.migrations.loader import MigrationLoader
from django.test import SimpleTestCase


class MigrationTests(SimpleTestCase):
    def test_migrations_have_no_conflicting_branches(self):
        self.assertEqual(MigrationLoader(None).detect_conflicts(), {})


from django.test import TestCase
from rest_framework.test import APIClient

from .models import Comanda, Funcionario, Gerente, Mesa


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
