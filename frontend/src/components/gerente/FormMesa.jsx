import { useState } from "react";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { ErroFormulario } from "./Avisos.jsx";
import Modal from "./Modal.jsx";

const campoClasse = "w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header";
const rotuloClasse = "block text-sm font-bold mb-2 text-header";

// Formulário de cadastro e edição de mesa. "mesa" vazia significa cadastro.
export default function FormMesa({ mesa, garcons, onFechar, onSucesso, onIrParaReserva }) {
  const [formulario, setFormulario] = useState({
    capacidade: mesa?.capacidade || 4,
    status: mesa?.status || "LIVRE",
    garcom_id: mesa?.garcom?.id || "",
  });
  const [erro, setErro] = useState("");

  function alterar(evento) {
    const { name, value } = evento.target;

    // Reservada não é escolhida aqui: leva para a agenda de reservas da mesa.
    if (name === "status" && value === "RESERVADA") {
      onIrParaReserva(mesa);
      return;
    }

    setFormulario({ ...formulario, [name]: value });
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");

    try {
      await requisicaoApi(mesa ? `/api/mesas/${mesa.id}/` : "/api/mesas/", {
        method: mesa ? "PUT" : "POST",
        body: JSON.stringify({
          capacidade: Number(formulario.capacidade),
          status: formulario.status,
          garcom_id: Number(formulario.garcom_id),
        }),
      });
      onSucesso(mesa ? "Mesa atualizada com sucesso!" : "Mesa cadastrada com sucesso!");
    } catch (falha) {
      setErro(mensagemDoErro(falha));
    }
  }

  return (
    <Modal titulo={mesa ? `Editar Mesa ${mesa.id}` : "Nova Mesa"} onFechar={onFechar}>
      <ErroFormulario mensagem={erro} />

      <form onSubmit={salvar} className="flex flex-col gap-4">
        <label>
          <span className={rotuloClasse}>Capacidade (Lugares)</span>
          <input required type="number" min="1" name="capacidade" value={formulario.capacidade} onChange={alterar} className={campoClasse} />
        </label>

        <label>
          <span className={rotuloClasse}>Garçom Responsável</span>
          <select required name="garcom_id" value={formulario.garcom_id} onChange={alterar} className={campoClasse}>
            <option value="">Selecione o garçom...</option>
            {garcons.map((garcom) => (
              <option key={garcom.id} value={garcom.id}>{garcom.nome}</option>
            ))}
          </select>
        </label>

        <label>
          <span className={rotuloClasse}>Status Físico Atual</span>
          <select name="status" value={formulario.status} onChange={alterar} className={campoClasse}>
            <option value="LIVRE">Livre</option>
            <option value="OCUPADA">Ocupada</option>
            {mesa && <option value="RESERVADA">Reservada (Ir para formulário de reserva)</option>}
            <option value="AGRUPADA">Agrupada</option>
            <option value="INATIVA">Inativa</option>
          </select>
        </label>

        <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-header/10">
          <button type="button" onClick={onFechar} className="bg-white text-header px-5 py-2.5 rounded-md font-bold border border-gray-300 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" className="bg-hover text-header px-5 py-2.5 rounded-md font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer">
            {mesa ? "Atualizar" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
