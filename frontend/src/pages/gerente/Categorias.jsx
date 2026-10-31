import { useEffect, useState } from "react";

// Função para capturar o token CSRF dos cookies do navegador (usada pois deu erro ver depois o padrão que é feito isso)
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState(null);
  const [erroFormulario, setErroFormulario] = useState("");
  
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const [nome, setNome] = useState("");
  const [tipoCategoria, setTipoCategoria] = useState("PRATO");

  const mostrarSucesso = (mensagem) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  const mostrarErro = (mensagem) => {
    setErroApi(mensagem);
    setTimeout(() => setErroApi(null), 5000);
  };

  const buscarCategorias = async () => {
    try {
      const resposta = await fetch("/api/categorias/");
      if (!resposta.ok) throw new Error(`Erro do servidor (${resposta.status})`);
      const dados = await resposta.json();
      
      const lista = Array.isArray(dados) ? dados : dados.results || [];
      setCategorias(lista);
    } catch (erro) {
      mostrarErro("Erro de Conexão. O React não conseguiu alcançar o Django.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarCategorias();
  }, []);

  const salvarCategoria = async (e) => {
    e.preventDefault();
    setErroFormulario("");
    setErroApi(null);
    
    const metodo = editandoId ? "PUT" : "POST";
    const url = editandoId ? `/api/categorias/${editandoId}/` : "/api/categorias/";
    const csrftoken = getCookie('csrftoken');

    try {
      const resposta = await fetch(url, {
        method: metodo,
        headers: { 
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },

        body: JSON.stringify({ nome: nome.trim(), tipo_categoria: tipoCategoria }),
      });

      if (!resposta.ok) {
        const erroData = await resposta.json().catch(() => ({}));
        
        if (erroData.detail && erroData.detail.includes("CSRF")) {
          throw new Error("Falha de segurança (CSRF). Recarregue a página e tente novamente.");
        }

        if (erroData.nome) {
          const msgNome = erroData.nome[0].toLowerCase();
          if (msgNome.includes("já existe") || msgNome.includes("already exists") || msgNome.includes("unique")) {
            throw new Error("Já existe uma categoria cadastrada com este nome.");
          }
          throw new Error(erroData.nome[0]);
        }
        
        if (erroData.detail) throw new Error(erroData.detail);
        
        throw new Error("Erro ao salvar categoria. Verifique os dados e tente novamente.");
      }

      mostrarSucesso(editandoId ? "Categoria atualizada!" : "Categoria cadastrada!");
      fecharModal();
      buscarCategorias();
    } catch (err) {
      setErroFormulario(err.message);
    }
  };

  const confirmarExclusao = (categoria) => {
    setCategoriaParaExcluir(categoria);
  };

  const executarExclusao = async () => {
    if (!categoriaParaExcluir) return;

    const csrftoken = getCookie('csrftoken');

    try {
      const resposta = await fetch(`/api/categorias/${categoriaParaExcluir.id}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrftoken // Token necessário também na exclusão
        }
      });

      if (!resposta.ok) {
        // Se o banco de dados barrar a exclusão por ter produtos vinculados, ele costuma retornar 500, 409 ou 400
        if (resposta.status === 500 || resposta.status === 409 || resposta.status === 400) {
          throw new Error("Não é possível excluir esta categoria pois existem produtos vinculados a ela.");
        }
        
        // Se o token CSRF der erro no delete
        const textoErro = await resposta.text();
        if (textoErro.includes("CSRF")) {
          throw new Error("Falha de segurança (CSRF). Recarregue a página e tente novamente.");
        }

        throw new Error("Erro ao excluir a categoria.");
      }

      mostrarSucesso("Categoria excluída com sucesso!");
      setCategoriaParaExcluir(null);
      buscarCategorias();
    } catch (err) {
      mostrarErro(err.message);
      setCategoriaParaExcluir(null);
    }
  };

  const abrirModalNovo = () => {
    setErroFormulario("");
    setEditandoId(null);
    setNome("");
    setTipoCategoria("PRATO");
    setModalAberto(true);
  };

  const abrirModalEditar = (cat) => {
    setErroFormulario("");
    setEditandoId(cat.id);
    setNome(cat.nome);
    setTipoCategoria(cat.tipo_categoria);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setErroFormulario("");
    setModalAberto(false);
    setEditandoId(null);
  };

  if (carregando) return <p className="text-header font-bold p-4">Buscando dados no servidor...</p>;

  return (
    <div className="relative pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">
          Gestão de Categorias
        </h1>
        <button 
          onClick={abrirModalNovo}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-bold shadow-sm transition-colors cursor-pointer"
        >
          + Nova Categoria
        </button>
      </div>

      {erroApi && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm transition-all duration-300">
          <p className="font-bold">Aviso:</p>
          <p>{erroApi}</p>
        </div>
      )}

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
            {categorias.length === 0 && !erroApi ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  Nenhuma categoria encontrada.
                </td>
              </tr>
            ) : (
              categorias.map((cat) => (
                <tr key={cat.id} className="hover:bg-destaque transition-colors group border-b border-gray-100 last:border-0">
                  <td className="p-4 font-bold text-header">{cat.nome}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold ${
                      cat.tipo_categoria === 'PRATO' 
                        ? 'bg-header text-destaque' 
                        : 'bg-hover text-header'
                    }`}>
                      {cat.tipo_categoria}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-4">
                    <button 
                      onClick={() => abrirModalEditar(cat)} 
                      className="text-gray-400 hover:text-hover transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => confirmarExclusao(cat)} 
                      className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mensagemSucesso && (
        <div className="fixed bottom-6 right-6 bg-header text-white px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-2 z-50 border-l-4 border-hover transition-opacity duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-hover">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {mensagemSucesso}
        </div>
      )}

      {categoriaParaExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque p-8 rounded-xl w-full max-w-md shadow-2xl text-center border-t-4 border-red-500">
            <h3 className="text-2xl font-bold text-header mb-3 font-header">Excluir Categoria?</h3>
            <p className="text-header/80 mb-8">
              Esta ação não pode ser desfeita. Tem certeza que deseja excluir a categoria <strong>{categoriaParaExcluir.nome}</strong>?
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setCategoriaParaExcluir(null)} 
                className="bg-white text-header px-6 py-2.5 rounded-md font-bold hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={executarExclusao} 
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-bold transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8">
            <button 
              onClick={fecharModal}
              className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl transition-colors cursor-pointer z-10"
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-header font-header">
              {editandoId ? "Editar Categoria" : "Nova Categoria"}
            </h2>

            <form onSubmit={salvarCategoria} className="flex flex-col gap-5">
              {erroFormulario && (
                <p role="alert" className="bg-red-100 text-red-700 p-3 rounded-md">
                  {erroFormulario}
                </p>
              )}

              <div>
                <label className="block text-sm font-bold mb-2 text-header">Nome da Categoria</label>
                <input 
                  type="text" 
                  required 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pratos Principais"
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-header">Tipo</label>
                <select 
                  value={tipoCategoria} 
                  onChange={(e) => setTipoCategoria(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header"
                >
                  <option value="PRATO">Prato</option>
                  <option value="BEBIDA">Bebida</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 mt-2 pt-4 border-t border-header/10">
                <button 
                  type="button" 
                  onClick={fecharModal} 
                  className="bg-white text-header px-6 py-3 rounded-md font-bold hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-hover text-header px-6 py-3 rounded-md font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                >
                  {editandoId ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
