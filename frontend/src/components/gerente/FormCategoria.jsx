import { useState } from "react";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { ErroFormulario } from "./Avisos.jsx";
import Modal from "./Modal.jsx";

const campoClasse = "w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header";

// Formulário de cadastro e edição de categoria. "categoria" vazia significa cadastro.
export default function FormCategoria({ categoria, onFechar, onSucesso }) {
  const [nome, setNome] = useState(categoria?.nome || "");
  const [tipoCategoria, setTipoCategoria] = useState(categoria?.tipo_categoria || "PRATO");
  const [erro, setErro] = useState("");

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");

    try {
      await requisicaoApi(categoria ? `/api/categorias/${categoria.id}/` : "/api/categorias/", {
        method: categoria ? "PUT" : "POST",
        body: JSON.stringify({ nome: nome.trim(), tipo_categoria: tipoCategoria }),
      });
      onSucesso(categoria ? "Categoria atualizada!" : "Categoria cadastrada!");
    } catch (falha) {
      setErro(mensagemDoErro(falha));
    }
  }

  return (
    <Modal titulo={categoria ? "Editar Categoria" : "Nova Categoria"} onFechar={onFechar}>
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <ErroFormulario mensagem={erro} />

        <div>
          <label htmlFor="categoria-nome" className="block text-sm font-bold mb-2 text-header">Nome da Categoria</label>
          <input
            id="categoria-nome"
            type="text"
            required
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Ex: Pratos Principais"
            className={campoClasse}
          />
        </div>

        <div>
          <label htmlFor="categoria-tipo" className="block text-sm font-bold mb-2 text-header">Tipo</label>
          <select
            id="categoria-tipo"
            value={tipoCategoria}
            onChange={(evento) => setTipoCategoria(evento.target.value)}
            className={campoClasse}
          >
            <option value="PRATO">Prato</option>
            <option value="BEBIDA">Bebida</option>
          </select>
        </div>

        <div className="flex justify-end gap-4 mt-2 pt-4 border-t border-header/10">
          <button type="button" onClick={onFechar} className="bg-white text-header px-6 py-3 rounded-md font-bold hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" className="bg-hover text-header px-6 py-3 rounded-md font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer">
            {categoria ? "Atualizar" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
