import { useState } from "react";
import { AvisoErro, AvisoSucesso } from "../../components/gerente/Avisos.jsx";
import FormMesa from "../../components/gerente/FormMesa.jsx";
import { IconeAgenda, IconeEditar, IconeExcluir, IconeJuntar, IconeSeparar } from "../../components/gerente/Icones.jsx";
import ModalConfirmacao from "../../components/gerente/ModalConfirmacao.jsx";
import ModalJuntarMesas from "../../components/gerente/ModalJuntarMesas.jsx";
import ModalReservas from "../../components/gerente/ModalReservas.jsx";
import { useDadosApi } from "../../hooks/useDadosApi.js";
import { useMensagemTemporaria } from "../../hooks/useMensagemTemporaria.js";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { estiloDoStatus, statusDaMesa } from "../../utils/mesas.js";

const filtroClasse = "w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover text-gray-700 bg-white";
const botaoAcao = "text-gray-400 transition-colors cursor-pointer";

function LinhaMesa({ mesa, onAbrir }) {
  const status = statusDaMesa(mesa);

  return (
    <tr className="border-b border-gray-100 hover:bg-[#FFF9E6] transition-colors">
      <td className="p-4 font-bold text-header">
        {mesa.id}
        {mesa.is_principal && (
          <span className="ml-2 text-xs bg-yellow-500 text-white font-bold px-2 py-0.5 rounded-full">Principal</span>
        )}
        {mesa.mesa_agrupada && (
          <span className="ml-2 text-xs text-yellow-700 font-normal">(Mesa Agrupada à {mesa.mesa_agrupada})</span>
        )}
      </td>
      <td className="p-4 text-gray-600">
        {mesa.capacidade_total} lugares
        {mesa.is_principal && (
          <span className="block text-xs text-yellow-600 font-semibold">(Soma com agrupadas)</span>
        )}
      </td>
      <td className="p-4 text-gray-600">{mesa.garcom?.nome || "-"}</td>
      <td className="p-4">
        <span className={estiloDoStatus(status)}>{status}</span>
      </td>
      <td className="p-4 flex justify-center gap-3 items-center">
        {status === "LIVRE" && (
          <button onClick={() => onAbrir("juntar", mesa)} className={`${botaoAcao} hover:text-yellow-600`} title="Juntar Mesas">
            <IconeJuntar />
          </button>
        )}
        {mesa.is_principal && (
          <button onClick={() => onAbrir("separar", mesa)} className={`${botaoAcao} hover:text-yellow-600`} title="Desagrupar Mesas">
            <IconeSeparar />
          </button>
        )}
        <button onClick={() => onAbrir("reservas", mesa)} className={`${botaoAcao} hover:text-yellow-600`} title="Agenda de Reservas">
          <IconeAgenda />
        </button>
        <button onClick={() => onAbrir("formulario", mesa)} className={`${botaoAcao} hover:text-emerald-600`} title="Editar">
          <IconeEditar />
        </button>
        <button onClick={() => onAbrir("excluir", mesa)} className={`${botaoAcao} hover:text-red-500`} title="Excluir">
          <IconeExcluir />
        </button>
      </td>
    </tr>
  );
}

// Confere se a mesa passa nos filtros de status e de garçom.
function passaNosFiltros(mesa, filtros) {
  const statusConfere = filtros.status === "todos" || statusDaMesa(mesa) === filtros.status;
  const nomeGarcom = mesa.garcom?.nome || "";
  const garcomConfere = nomeGarcom.toLowerCase().includes(filtros.garcom.toLowerCase());

  return statusConfere && garcomConfere;
}

export default function Mesas() {
  const { dados, erro, carregando, recarregar } = useDadosApi([
    "/api/mesas/",
    "/api/funcionarios/?cargo=GARCOM&ativo=true",
  ]);
  const [mesas, garcons] = dados;

  const [filtros, setFiltros] = useState({ status: "todos", garcom: "" });
  // Janela aberta no momento: { tipo, idMesa }. Tipos: formulario, reservas, juntar, separar, excluir.
  const [janela, setJanela] = useState(null);
  const [erroAcao, setErroAcao] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useMensagemTemporaria();

  // Busca a mesa pelo id para sempre mostrar os dados mais recentes (ex.: reservas).
  const mesaDaJanela = janela ? mesas.find((mesa) => mesa.id === janela.idMesa) : null;

  function abrir(tipo, mesa = null) {
    setErroAcao("");

    if (tipo === "reservas" && mesa.status === "INATIVA") {
      setErroAcao(`A Mesa ${mesa.id} está INATIVA. Ative a mesa antes de efetuar reservas.`);
      return;
    }

    setJanela({ tipo, idMesa: mesa?.id });
  }

  function fechar() {
    setJanela(null);
    setErroAcao("");
  }

  function aoConcluir(mensagem) {
    fechar();
    setMensagemSucesso(mensagem);
    recarregar();
  }

  // A agenda continua aberta depois de salvar, para o gerente ver a reserva na lista.
  function aoAlterarReserva(mensagem) {
    setMensagemSucesso(mensagem);
    recarregar();
  }

  async function separar() {
    try {
      await requisicaoApi(`/api/mesas/${mesaDaJanela.id}/separar/`, { method: "POST" });
      aoConcluir(`Mesas desagrupadas da Mesa ${mesaDaJanela.id} com sucesso!`);
    } catch (falha) {
      setErroAcao(mensagemDoErro(falha));
    }
  }

  async function excluir() {
    try {
      await requisicaoApi(`/api/mesas/${mesaDaJanela.id}/`, { method: "DELETE" });
      aoConcluir("Mesa removida com sucesso!");
    } catch (falha) {
      setErroAcao(mensagemDoErro(falha));
    }
  }

  if (carregando) return <p className="text-header font-bold p-4">Carregando mesas do banco de dados...</p>;

  const mesasFiltradas = mesas.filter((mesa) => passaNosFiltros(mesa, filtros));
  const tipoDaJanela = janela?.tipo;

  return (
    <div className="relative pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">Gestão de Mesas</h1>
        <button
          onClick={() => abrir("formulario")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-bold shadow-sm transition-colors cursor-pointer"
        >
          + Nova Mesa
        </button>
      </div>

      <AvisoErro mensagem={erro} />
      {!janela && <AvisoErro mensagem={erroAcao} />}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Buscar por nome do garçom..."
            value={filtros.garcom}
            onChange={(evento) => setFiltros({ ...filtros, garcom: evento.target.value })}
            className={filtroClasse}
          />
        </div>
        <div className="md:w-64 w-full">
          <select
            value={filtros.status}
            onChange={(evento) => setFiltros({ ...filtros, status: evento.target.value })}
            className={filtroClasse}
          >
            <option value="todos">Todos os Status</option>
            <option value="LIVRE">Livre</option>
            <option value="OCUPADA">Ocupada</option>
            <option value="RESERVADA">Reservada</option>
            <option value="AGRUPADA">Agrupada</option>
            <option value="INATIVA">Inativa</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm">
                <th className="p-4 font-bold text-gray-800">Mesa</th>
                <th className="p-4 font-bold text-gray-800">Capacidade</th>
                <th className="p-4 font-bold text-gray-800">Garçom</th>
                <th className="p-4 font-bold text-gray-800">Status</th>
                <th className="p-4 font-bold text-gray-800 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mesasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">Nenhuma mesa encontrada com esses filtros.</td>
                </tr>
              )}
              {mesasFiltradas.map((mesa) => (
                <LinhaMesa key={mesa.id} mesa={mesa} onAbrir={abrir} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-gray-500 text-sm">
        Total de mesas encontradas: <strong>{mesasFiltradas.length}</strong>
      </p>

      <AvisoSucesso mensagem={mensagemSucesso} />

      {tipoDaJanela === "formulario" && (
        <FormMesa
          mesa={mesaDaJanela}
          garcons={garcons}
          onFechar={fechar}
          onSucesso={aoConcluir}
          onIrParaReserva={(mesa) => abrir("reservas", mesa)}
        />
      )}

      {tipoDaJanela === "reservas" && mesaDaJanela && (
        <ModalReservas mesa={mesaDaJanela} mesas={mesas} onFechar={fechar} onSucesso={aoAlterarReserva} />
      )}

      {tipoDaJanela === "juntar" && mesaDaJanela && (
        <ModalJuntarMesas mesaPrincipal={mesaDaJanela} mesas={mesas} onFechar={fechar} onSucesso={aoConcluir} />
      )}

      {tipoDaJanela === "separar" && mesaDaJanela && (
        <ModalConfirmacao titulo="Separar Mesas?" erro={erroAcao} textoConfirmar="Sim, Separar" onConfirmar={separar} onCancelar={fechar}>
          Tem certeza que deseja desagrupar todas as mesas vinculadas à <strong>Mesa {mesaDaJanela.id}</strong>?
        </ModalConfirmacao>
      )}

      {tipoDaJanela === "excluir" && mesaDaJanela && (
        <ModalConfirmacao titulo="Remover Mesa?" erro={erroAcao} textoConfirmar="Sim, Remover" onConfirmar={excluir} onCancelar={fechar}>
          Tem certeza que deseja remover a <strong>Mesa {mesaDaJanela.id}</strong>?
        </ModalConfirmacao>
      )}
    </div>
  );
}
