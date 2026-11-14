import { useState } from "react";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { reservaVazia } from "../../utils/mesas.js";
import { ErroFormulario } from "./Avisos.jsx";
import Modal from "./Modal.jsx";
import ModalConfirmacao from "./ModalConfirmacao.jsx";

const campoClasse = "w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover bg-white text-header text-sm";
const rotuloClasse = "block text-xs font-bold mb-1 text-header";

// Uma reserva da lista. Clicar nela carrega os dados no formulário para edição.
function ItemReserva({ reserva, selecionada, onEditar, onCancelar }) {
  const emGrupo = reserva.mesas_agrupadas_ids.length > 0;
  const cor = emGrupo ? "bg-yellow-50 border-hover hover:bg-yellow-100" : "bg-gray-50 border-gray-200 hover:bg-gray-100";

  function cancelar(evento) {
    // Evita que o clique no botão também selecione a reserva para edição.
    evento.stopPropagation();
    onCancelar(reserva);
  }

  return (
    <div
      onClick={() => onEditar(reserva)}
      title="Clique para editar esta reserva"
      className={`flex justify-between items-center p-3 rounded-lg text-sm border cursor-pointer hover:shadow-sm transition-all ${cor} ${selecionada ? "ring-2 ring-hover" : ""}`}
    >
      <div>
        <p className="font-bold text-header">
          {reserva.cliente_nome}
          {emGrupo && (
            <span className="ml-2 bg-hover text-header text-[10px] px-2 py-0.5 rounded-full font-bold">Reserva de Grupo</span>
          )}
        </p>
        <p className="text-xs text-header/80 mt-0.5">
          Data: {reserva.data_reserva} às {reserva.hora_reserva}
          {reserva.cliente_telefone && ` | Tel: ${reserva.cliente_telefone}`}
        </p>
        {emGrupo && (
          <p className="text-xs font-semibold text-header mt-1">
            Mesas Agrupadas: {reserva.mesa} e {reserva.mesas_agrupadas_ids.join(", ")}
          </p>
        )}
      </div>
      <button type="button" onClick={cancelar} className="text-red-500 hover:text-red-700 text-xs font-bold underline cursor-pointer px-2">
        Cancelar
      </button>
    </div>
  );
}

// Mesas que podem entrar na mesma reserva, mostradas como botões de marcar.
function SelecaoDeMesas({ mesas, selecionadas, onAlternar }) {
  return (
    <div className="mb-4">
      <span className="block text-sm font-bold text-gray-700 mb-2">Agrupar com outras mesas (Opcional)</span>
      <div className="flex flex-wrap gap-2">
        {mesas.map((mesa) => {
          const marcada = selecionadas.includes(mesa.id);
          return (
            <label
              key={mesa.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                marcada ? "bg-hover border-hover text-header font-semibold" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <input type="checkbox" className="hidden" checked={marcada} onChange={() => onAlternar(mesa.id)} />
              Mesa {mesa.id}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-1">Selecione as mesas que farão parte desta mesma reserva.</p>
    </div>
  );
}

// Agenda de reservas de uma mesa: lista as reservas e permite criar, editar e cancelar.
export default function ModalReservas({ mesa, mesas, onFechar, onSucesso }) {
  const [formulario, setFormulario] = useState(reservaVazia);
  // Reserva em edição; null significa que o formulário cria uma nova.
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState("");
  const [paraCancelar, setParaCancelar] = useState(null);
  const [erroCancelamento, setErroCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const outrasMesas = mesas.filter((outra) => outra.id !== mesa.id && outra.status !== "INATIVA");

  function limparFormulario() {
    setEditandoId(null);
    setFormulario(reservaVazia());
    setErro("");
  }

  function editar(reserva) {
    setEditandoId(reserva.id);
    setFormulario({
      cliente_nome: reserva.cliente_nome,
      cliente_telefone: reserva.cliente_telefone || "",
      data_reserva: reserva.data_reserva,
      hora_reserva: reserva.hora_reserva,
      mesas_agrupadas_ids: reserva.mesas_agrupadas_ids,
    });
    setErro("");
  }

  function alterar(evento) {
    setFormulario({ ...formulario, [evento.target.name]: evento.target.value });
  }

  function alternarMesa(idMesa) {
    const atuais = formulario.mesas_agrupadas_ids;
    const novas = atuais.includes(idMesa) ? atuais.filter((id) => id !== idMesa) : [...atuais, idMesa];
    setFormulario({ ...formulario, mesas_agrupadas_ids: novas });
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");

    try {
      await requisicaoApi(editandoId ? `/api/reservas/${editandoId}/` : `/api/mesas/${mesa.id}/reservar/`, {
        method: editandoId ? "PUT" : "POST",
        body: JSON.stringify(formulario),
      });
      onSucesso(editandoId ? "Reserva atualizada!" : `Reserva agendada para ${formulario.cliente_nome}!`);
      limparFormulario();
    } catch (falha) {
      setErro(mensagemDoErro(falha));
    }
  }

  function pedirCancelamento(reserva) {
    setErroCancelamento("");
    setParaCancelar(reserva);
  }

  async function cancelarReserva() {
    setCancelando(true);
    setErroCancelamento("");

    try {
      await requisicaoApi(`/api/reservas/${paraCancelar.id}/`, { method: "DELETE" });
      if (editandoId === paraCancelar.id) limparFormulario();
      setParaCancelar(null);
      onSucesso("Reserva cancelada com sucesso!");
    } catch (falha) {
      setErroCancelamento(mensagemDoErro(falha));
    } finally {
      setCancelando(false);
    }
  }

  return (
    <Modal
      titulo={`Agenda da Mesa ${mesa.id}`}
      subtitulo={`Capacidade: ${mesa.capacidade} lugares`}
      largura="max-w-lg"
      onFechar={onFechar}
    >
      <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xs font-bold text-header mb-3 uppercase tracking-wide">Reservas Agendadas</h3>

        {mesa.reservas.length === 0 && (
          <p className="text-xs text-gray-500">Nenhuma reserva futura agendada para esta mesa.</p>
        )}

        {mesa.reservas.length > 0 && (
          <div className="flex flex-col gap-2">
            {mesa.reservas.map((reserva) => (
              <ItemReserva
                key={reserva.id}
                reserva={reserva}
                selecionada={editandoId === reserva.id}
                onEditar={editar}
                onCancelar={pedirCancelamento}
              />
            ))}
            <p className="text-xs text-gray-500 mt-2 text-center">Clique em uma reserva acima para editá-la.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-header uppercase tracking-wide">
          {editandoId ? "Editando Reserva" : "+ Adicionar Nova Reserva"}
        </h3>
        {editandoId && (
          <button type="button" onClick={limparFormulario} className="text-xs text-red-500 hover:text-red-700 font-bold underline cursor-pointer">
            Cancelar Edição
          </button>
        )}
      </div>

      <ErroFormulario mensagem={erro} />

      <form onSubmit={salvar} className="flex flex-col gap-3">
        <label>
          <span className={rotuloClasse}>Nome do Cliente *</span>
          <input required type="text" name="cliente_nome" placeholder="Ex: Maria Silva" value={formulario.cliente_nome} onChange={alterar} className={campoClasse} />
        </label>

        <label>
          <span className={rotuloClasse}>Telefone / WhatsApp</span>
          <input type="text" name="cliente_telefone" placeholder="(00) 00000-0000" value={formulario.cliente_telefone} onChange={alterar} className={campoClasse} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={rotuloClasse}>Data *</span>
            <input required type="date" name="data_reserva" value={formulario.data_reserva} onChange={alterar} className={campoClasse} />
          </label>
          <label>
            <span className={rotuloClasse}>Horário *</span>
            <input required type="time" name="hora_reserva" value={formulario.hora_reserva} onChange={alterar} className={campoClasse} />
          </label>
        </div>

        <SelecaoDeMesas mesas={outrasMesas} selecionadas={formulario.mesas_agrupadas_ids} onAlternar={alternarMesa} />

        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-header/10">
          <button type="button" onClick={onFechar} className="bg-white text-header px-4 py-2 rounded-md font-bold text-sm border border-gray-300 cursor-pointer">
            Fechar
          </button>
          <button type="submit" className="bg-hover text-header px-4 py-2 rounded-md font-bold text-sm transition-colors cursor-pointer">
            {editandoId ? "Atualizar Reserva" : "Salvar Reserva"}
          </button>
        </div>
      </form>

      {paraCancelar && (
        <ModalConfirmacao
          titulo="Cancelar Reserva?"
          erro={erroCancelamento}
          ocupado={cancelando}
          textoConfirmar="Sim, Cancelar"
          textoCancelar="Manter"
          onConfirmar={cancelarReserva}
          onCancelar={() => setParaCancelar(null)}
        >
          Deseja remover a reserva de <strong>{paraCancelar.cliente_nome}</strong> agendada para{" "}
          <strong>{paraCancelar.data_reserva}</strong> às <strong>{paraCancelar.hora_reserva}</strong>?
        </ModalConfirmacao>
      )}
    </Modal>
  );
}
