import { useState } from "react";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { statusDaMesa } from "../../utils/mesas.js";
import { ErroFormulario } from "./Avisos.jsx";
import Modal from "./Modal.jsx";

// Escolhe as mesas livres que serão agrupadas à mesa principal.
export default function ModalJuntarMesas({ mesaPrincipal, mesas, onFechar, onSucesso }) {
  const [selecionadas, setSelecionadas] = useState([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const mesasLivres = mesas.filter(
    (mesa) => mesa.id !== mesaPrincipal.id && statusDaMesa(mesa) === "LIVRE"
  );

  function alternarSelecao(idMesa) {
    if (selecionadas.includes(idMesa)) {
      setSelecionadas(selecionadas.filter((id) => id !== idMesa));
    } else {
      setSelecionadas([...selecionadas, idMesa]);
    }
  }

  async function juntar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErro("");

    try {
      await requisicaoApi(`/api/mesas/${mesaPrincipal.id}/juntar/`, {
        method: "POST",
        body: JSON.stringify({ mesas_ids: selecionadas }),
      });
      onSucesso(`Mesas agrupadas à Mesa ${mesaPrincipal.id} com sucesso!`);
    } catch (falha) {
      setErro(mensagemDoErro(falha));
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={`Juntar à Mesa ${mesaPrincipal.id}`}
      subtitulo="Selecione as mesas livres que serão agrupadas a esta mesa principal."
      onFechar={onFechar}
    >
      <ErroFormulario mensagem={erro} />

      <form onSubmit={juntar}>
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4 flex flex-col gap-2">
          {mesasLivres.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-500">Nenhuma outra mesa LIVRE disponível no momento.</p>
          )}

          {mesasLivres.map((mesa) => {
            const marcada = selecionadas.includes(mesa.id);
            return (
              <label
                key={mesa.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  marcada ? "bg-yellow-50 border-hover" : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={marcada} onChange={() => alternarSelecao(mesa.id)} className="w-4 h-4 text-hover rounded focus:ring-hover cursor-pointer" />
                  <span className="font-bold text-header">Mesa {mesa.id}</span>
                </div>
                <span className="text-xs text-header/70 font-medium">{mesa.capacidade} lugares</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-header/10">
          <button type="button" onClick={onFechar} className="bg-white text-header px-4 py-2 rounded-md font-bold text-sm border border-gray-300 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={enviando || selecionadas.length === 0} className="bg-hover text-header px-4 py-2 rounded-md font-bold text-sm transition-colors cursor-pointer disabled:opacity-50">
            {enviando ? "Agrupando..." : "Confirmar Junção"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
