import { useState } from "react";
import { AvisoErro, AvisoSucesso } from "../../components/gerente/Avisos.jsx";
import FormProduto from "../../components/gerente/FormProduto.jsx";
import { IconeEditar, IconeExcluir } from "../../components/gerente/Icones.jsx";
import ModalConfirmacao from "../../components/gerente/ModalConfirmacao.jsx";
import { useDadosApi } from "../../hooks/useDadosApi.js";
import { useMensagemTemporaria } from "../../hooks/useMensagemTemporaria.js";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { IMAGEM_PADRAO } from "../../utils/produtos.js";

const filtroClasse = "w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-gray-700 bg-white";

function LinhaProduto({ produto, onEditar, onExcluir }) {
  return (
    <tr className="hover:bg-destaque transition-colors group border-b border-gray-100 last:border-0">
      <td className="p-4">
        <img src={produto.imagem || IMAGEM_PADRAO} alt={produto.nome} className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-gray-50" />
      </td>
      <td className="p-4 font-bold text-header">{produto.nome}</td>
      <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={produto.descricao}>
        {produto.descricao || "-"}
      </td>
      <td className="p-4 text-gray-600">{produto.categoria?.nome}</td>
      <td className="p-4 text-gray-600">{Number(produto.preco_unitario).toFixed(2)}</td>
      <td className="p-4">
        {produto.disponivel
          ? <span className="text-emerald-600 font-bold">Disponível</span>
          : <span className="text-red-500 font-bold">Esgotado</span>}
      </td>
      <td className="p-4 text-center space-x-4">
        <button onClick={() => onEditar(produto)} className="text-gray-400 hover:text-hover transition-colors cursor-pointer" title="Editar">
          <IconeEditar />
        </button>
        <button onClick={() => onExcluir(produto)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Excluir">
          <IconeExcluir />
        </button>
      </td>
    </tr>
  );
}

// Confere se o produto passa nos três filtros da tela.
function passaNosFiltros(produto, filtros) {
  const nomeConfere = produto.nome.toLowerCase().includes(filtros.nome.toLowerCase());
  const categoriaConfere = filtros.categoria === "" || String(produto.categoria?.id) === filtros.categoria;
  const disponibilidadeConfere =
    filtros.disponibilidade === "todos" ||
    (filtros.disponibilidade === "disponivel") === produto.disponivel;

  return nomeConfere && categoriaConfere && disponibilidadeConfere;
}

export default function Produtos() {
  const { dados, erro, carregando, recarregar } = useDadosApi(["/api/itens/", "/api/categorias/"]);
  const [produtos, categorias] = dados;

  const [filtros, setFiltros] = useState({ nome: "", categoria: "", disponibilidade: "todos" });
  // null = formulário fechado; { produto: null } = novo; { produto } = edição
  const [formulario, setFormulario] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [erroExclusao, setErroExclusao] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useMensagemTemporaria();

  function alterarFiltro(evento) {
    setFiltros({ ...filtros, [evento.target.name]: evento.target.value });
  }

  function aoSalvar(mensagem) {
    setFormulario(null);
    setMensagemSucesso(mensagem);
    recarregar();
  }

  function pedirExclusao(produto) {
    setErroExclusao("");
    setParaExcluir(produto);
  }

  async function excluir() {
    try {
      await requisicaoApi(`/api/itens/${paraExcluir.id}/`, { method: "DELETE" });
      setParaExcluir(null);
      setMensagemSucesso("Produto excluído com sucesso!");
      recarregar();
    } catch (falha) {
      setErroExclusao(mensagemDoErro(falha));
    }
  }

  if (carregando) return <p className="text-header font-bold p-4">Buscando dados no servidor...</p>;

  const produtosFiltrados = produtos.filter((produto) => passaNosFiltros(produto, filtros));

  return (
    <div className="relative pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">Gestão de Produtos</h1>
        <button
          onClick={() => setFormulario({ produto: null })}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-bold shadow-sm transition-colors cursor-pointer"
        >
          + Novo Produto
        </button>
      </div>

      <AvisoErro mensagem={erro} />

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input type="text" name="nome" placeholder="Buscar produto por nome..." value={filtros.nome} onChange={alterarFiltro} className={filtroClasse} />
        </div>
        <div className="md:w-56">
          <select name="categoria" value={filtros.categoria} onChange={alterarFiltro} className={filtroClasse}>
            <option value="">Todas as Categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
            ))}
          </select>
        </div>
        <div className="md:w-48">
          <select name="disponibilidade" value={filtros.disponibilidade} onChange={alterarFiltro} className={filtroClasse}>
            <option value="todos">Todos os Status</option>
            <option value="disponivel">Disponíveis</option>
            <option value="esgotado">Esgotados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="p-4 text-header font-bold w-16">Foto</th>
              <th className="p-4 text-header font-bold">Nome</th>
              <th className="p-4 text-header font-bold">Descrição</th>
              <th className="p-4 text-header font-bold">Categoria</th>
              <th className="p-4 text-header font-bold">Preço (R$)</th>
              <th className="p-4 text-header font-bold">Status</th>
              <th className="p-4 text-header font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 && !erro && (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">Nenhum produto encontrado.</td>
              </tr>
            )}
            {produtosFiltrados.map((produto) => (
              <LinhaProduto
                key={produto.id}
                produto={produto}
                onEditar={(selecionado) => setFormulario({ produto: selecionado })}
                onExcluir={pedirExclusao}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AvisoSucesso mensagem={mensagemSucesso} />

      {paraExcluir && (
        <ModalConfirmacao
          titulo="Excluir Produto?"
          erro={erroExclusao}
          textoConfirmar="Sim, Excluir"
          onConfirmar={excluir}
          onCancelar={() => setParaExcluir(null)}
        >
          Esta ação não pode ser desfeita. Tem certeza que deseja excluir <strong>{paraExcluir.nome}</strong>?
        </ModalConfirmacao>
      )}

      {formulario && (
        <FormProduto
          produto={formulario.produto}
          categorias={categorias}
          onFechar={() => setFormulario(null)}
          onSucesso={aoSalvar}
        />
      )}
    </div>
  );
}
