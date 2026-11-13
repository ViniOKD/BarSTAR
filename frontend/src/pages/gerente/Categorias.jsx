import { useState } from "react";
import { AvisoErro, AvisoSucesso } from "../../components/gerente/Avisos.jsx";
import FormCategoria from "../../components/gerente/FormCategoria.jsx";
import { IconeEditar, IconeExcluir } from "../../components/gerente/Icones.jsx";
import ModalConfirmacao from "../../components/gerente/ModalConfirmacao.jsx";
import { useDadosApi } from "../../hooks/useDadosApi.js";
import { useMensagemTemporaria } from "../../hooks/useMensagemTemporaria.js";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";

function LinhaCategoria({ categoria, onEditar, onExcluir }) {
  const corDoTipo = categoria.tipo_categoria === "PRATO" ? "bg-header text-destaque" : "bg-hover text-header";

  return (
    <tr className="hover:bg-destaque transition-colors group border-b border-gray-100 last:border-0">
      <td className="p-4 font-bold text-header">{categoria.nome}</td>
      <td className="p-4">
        <span className={`px-3 py-1 rounded-md text-xs font-bold ${corDoTipo}`}>
          {categoria.tipo_categoria}
        </span>
      </td>
      <td className="p-4 text-center space-x-4">
        <button onClick={() => onEditar(categoria)} className="text-gray-400 hover:text-hover transition-colors cursor-pointer" title="Editar">
          <IconeEditar />
        </button>
        <button onClick={() => onExcluir(categoria)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Excluir">
          <IconeExcluir />
        </button>
      </td>
    </tr>
  );
}

export default function Categorias() {
  const { dados, erro, carregando, recarregar } = useDadosApi(["/api/categorias/"]);
  const [categorias] = dados;

  // null = formulário fechado; { categoria: null } = nova; { categoria } = edição
  const [formulario, setFormulario] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [erroExclusao, setErroExclusao] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useMensagemTemporaria();

  function aoSalvar(mensagem) {
    setFormulario(null);
    setMensagemSucesso(mensagem);
    recarregar();
  }

  function pedirExclusao(categoria) {
    setErroExclusao("");
    setParaExcluir(categoria);
  }

  async function excluir() {
    try {
      await requisicaoApi(`/api/categorias/${paraExcluir.id}/`, { method: "DELETE" });
      setParaExcluir(null);
      setMensagemSucesso("Categoria excluída com sucesso!");
      recarregar();
    } catch (falha) {
      setErroExclusao(mensagemDoErro(falha));
    }
  }

  if (carregando) return <p className="text-header font-bold p-4">Buscando dados no servidor...</p>;

  return (
    <div className="relative pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">Gestão de Categorias</h1>
        <button
          onClick={() => setFormulario({ categoria: null })}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-bold shadow-sm transition-colors cursor-pointer"
        >
          + Nova Categoria
        </button>
      </div>

      <AvisoErro mensagem={erro} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="p-4 text-header font-bold">Nome</th>
              <th className="p-4 text-header font-bold">Tipo</th>
              <th className="p-4 text-header font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 && !erro && (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">Nenhuma categoria encontrada.</td>
              </tr>
            )}
            {categorias.map((categoria) => (
              <LinhaCategoria
                key={categoria.id}
                categoria={categoria}
                onEditar={(selecionada) => setFormulario({ categoria: selecionada })}
                onExcluir={pedirExclusao}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AvisoSucesso mensagem={mensagemSucesso} />

      {paraExcluir && (
        <ModalConfirmacao
          titulo="Excluir Categoria?"
          erro={erroExclusao}
          textoConfirmar="Sim, Excluir"
          onConfirmar={excluir}
          onCancelar={() => setParaExcluir(null)}
        >
          Esta ação não pode ser desfeita. Tem certeza que deseja excluir a categoria <strong>{paraExcluir.nome}</strong>?
        </ModalConfirmacao>
      )}

      {formulario && (
        <FormCategoria
          categoria={formulario.categoria}
          onFechar={() => setFormulario(null)}
          onSucesso={aoSalvar}
        />
      )}
    </div>
  );
}
