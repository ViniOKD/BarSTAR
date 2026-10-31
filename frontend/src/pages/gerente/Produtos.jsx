import { useState, useEffect } from "react";

// Função nativa para capturar o token CSRF dos cookies do navegador
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

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState(null); 
  
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null); 
  const [mensagemSucesso, setMensagemSucesso] = useState(""); 

  const [buscaNome, setBuscaNome] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState("todos");
  
  const DEFAULT_IMAGE = "http://localhost:8000/media/itens/default.png";
  const [previewImagem, setPreviewImagem] = useState(DEFAULT_IMAGE);

  const estadoInicial = {
    nome: "", descricao: "", preco_unitario: "", categoria_id: "", disponivel: true,
    peso: "", tempo_preparo_minutos: "", ponto_carne: "", teor_alcoolico: "", volume_ml: "",
    imagem: null
  };
  const [formData, setFormData] = useState(estadoInicial);

  const buscarDados = async () => {
    try {
      setErroApi(null);
      const [respostaProdutos, respostaCategorias] = await Promise.all([
        fetch("/api/itens/"),
        fetch("/api/categorias/")
      ]);

      if (respostaProdutos.ok && respostaCategorias.ok) {
        const dadosProd = await respostaProdutos.json();
        const dadosCat = await respostaCategorias.json();
        setProdutos(dadosProd.results ? dadosProd.results : dadosProd);
        setCategorias(dadosCat.results ? dadosCat.results : dadosCat);
      } else {
        let erros = [];
        if (!respostaProdutos.ok) erros.push(`Produtos (${respostaProdutos.status})`);
        if (!respostaCategorias.ok) erros.push(`Categorias (${respostaCategorias.status})`);

        setErroApi(`Erro no servidor ao carregar: ${erros.join(" e ")}.`);
      }
    } catch (erro) {
      setErroApi("Erro de Conexão. O React não conseguiu alcançar o Django.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDados();
  }, []);

  const mostrarSucesso = (mensagem) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => {
      setMensagemSucesso("");
    }, 3000);
  };

  const categoriaSelecionada = categorias.find(
    (c) => String(c.id) === String(formData.categoria_id)
  );

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "file") {
      const arquivo = files[0];
      if (arquivo) {
        setFormData({ ...formData, imagem: arquivo });
        setPreviewImagem(URL.createObjectURL(arquivo));
      }
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value
      });
    }
  };

  const abrirModalNovo = () => {
    setEditandoId(null);
    setFormData(estadoInicial);
    setPreviewImagem(DEFAULT_IMAGE);
    setModalAberto(true);
  };

  const abrirModalEdicao = (produto) => {
    setEditandoId(produto.id);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco_unitario: produto.preco_unitario,
      categoria_id: produto.categoria?.id || produto.categoria_id || "",
      disponivel: produto.disponivel,
      peso: produto.peso || "",
      tempo_preparo_minutos: produto.tempo_preparo_minutos || "",
      ponto_carne: produto.ponto_carne || "",
      teor_alcoolico: produto.teor_alcoolico !== undefined && produto.teor_alcoolico !== null ? produto.teor_alcoolico : "",
      volume_ml: produto.volume_ml || "",
      imagem: null
    });
    
    setPreviewImagem(produto.imagem || DEFAULT_IMAGE);
    setModalAberto(true);
  };

  const confirmarExclusao = (produto) => {
    setProdutoParaExcluir(produto);
  };

  const executarExclusao = async () => {
    if (!produtoParaExcluir) return;

    // Pega o token de segurança
    const csrftoken = getCookie('csrftoken');

    try {
      const resposta = await fetch(`/api/itens/${produtoParaExcluir.id}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrftoken // Envia o token na exclusão
        }
      });

      if (resposta.ok) {
        mostrarSucesso("Produto excluído com sucesso!");
        setProdutoParaExcluir(null);
        buscarDados();
      } else {
        const textoErro = await resposta.text();
        if (textoErro.includes("CSRF")) {
          alert("Falha de segurança (CSRF). Recarregue a página e tente novamente.");
        } else {
          alert("Erro ao excluir o produto.");
        }
      }
    } catch (erro) {
      console.error("Erro na requisição:", erro);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.preco_unitario || Number(formData.preco_unitario) <= 0) {
      alert("O preço do produto é obrigatório e deve ser maior que zero!");
      return;
    }

    if (categoriaSelecionada?.tipo_categoria === "PRATO") {
      if (!formData.peso || Number(formData.peso) < 1) {
        alert("O peso é obrigatório para pratos e deve ser de no mínimo 1g.");
        return;
      }
      if (!formData.tempo_preparo_minutos || Number(formData.tempo_preparo_minutos) < 1) {
        alert("O tempo de preparo é obrigatório para pratos e deve ser de no mínimo 1 minuto.");
        return;
      }
    } else if (categoriaSelecionada?.tipo_categoria === "BEBIDA") {
      if (!formData.volume_ml || Number(formData.volume_ml) < 1) {
        alert("O volume é obrigatório para bebidas e deve ser de no mínimo 1 ml.");
        return;
      }
      const teor = Number(formData.teor_alcoolico);
      if (formData.teor_alcoolico === "" || !Number.isFinite(teor) || teor < 0 || teor > 100) {
        alert("Informe um teor alcoólico entre 0 e 100%. Use 0 para bebidas sem álcool.");
        return;
      }
    }

    const data = new FormData();
    data.append("nome", formData.nome.trim());
    data.append("descricao", formData.descricao || "");
    data.append("preco_unitario", Number(formData.preco_unitario));
    data.append("categoria_id", Number(formData.categoria_id));
    data.append("disponivel", formData.disponivel);
    // data.append("gerente", 1); <-- REMOVIDO! O Django deve injetar isso via perform_create no viewsets igual nas categorias

    if (formData.imagem instanceof File) {
      data.append("imagem", formData.imagem);
    }

    if (categoriaSelecionada?.tipo_categoria === "PRATO") {
      if (formData.peso) data.append("peso", Number(formData.peso));
      if (formData.tempo_preparo_minutos) data.append("tempo_preparo_minutos", Number(formData.tempo_preparo_minutos));
      if (formData.ponto_carne) data.append("ponto_carne", formData.ponto_carne);
    } else if (categoriaSelecionada?.tipo_categoria === "BEBIDA") {
      if (formData.volume_ml) data.append("volume_ml", Number(formData.volume_ml));
      data.append("teor_alcoolico", Number(formData.teor_alcoolico));
    }

    // Pega o token de segurança
    const csrftoken = getCookie('csrftoken');

    try {
      const metodo = editandoId ? "PUT" : "POST";
      const url = editandoId ? `/api/itens/${editandoId}/` : "/api/itens/";

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          "X-CSRFToken": csrftoken // Envia o token na criação/edição
        },
        body: data
      });

      if (resposta.ok) {
        mostrarSucesso(editandoId ? "Produto atualizado!" : "Produto cadastrado!");
        setModalAberto(false);
        buscarDados(); 
      } else {
        const erros = await resposta.json().catch(() => ({}));
        if (erros.detail && erros.detail.includes("CSRF")) {
           alert("Falha de segurança (CSRF). Recarregue a página e tente novamente.");
        } else if (erros.preco_unitario) {
           alert(erros.preco_unitario.join("\n"));
        } else if (erros.teor_alcoolico) {
           alert(erros.teor_alcoolico.join("\n"));
        } else {
           alert("Erro ao salvar! Veja o console para detalhes.");
           console.error("Erros do Django:", erros);
        }
      }
    } catch (erro) {
      console.error("Erro na requisição:", erro);
    }
  };

  if (carregando) return <p className="text-header font-bold p-4">Buscando dados no servidor...</p>;

  // Lógica de filtro encadeado
  const produtosFiltrados = produtos.filter((produto) => {
    const matchNome = produto.nome.toLowerCase().includes(buscaNome.toLowerCase());
    const matchCategoria = filtroCategoria === "" || String(produto.categoria?.id || produto.categoria_id) === filtroCategoria;
    const matchDisponibilidade = 
      filtroDisponibilidade === "todos" ? true :
      filtroDisponibilidade === "disponivel" ? produto.disponivel === true :
      produto.disponivel === false;

    return matchNome && matchCategoria && matchDisponibilidade;
  });

  return (
    <div className="relative pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">
          Gestão de Produtos
        </h1>
        <button 
          onClick={abrirModalNovo}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-bold shadow-sm transition-colors cursor-pointer"
        >
          + Novo Produto
        </button>
      </div>

      {erroApi && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p className="font-bold">Aviso de Comunicação API:</p>
          <p>{erroApi}</p>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Buscar produto por nome..." 
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="w-full border border-gray-300 p-2.5 pl-10 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-gray-700"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-3 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <div className="md:w-56">
          <select 
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-gray-700 bg-white"
          >
            <option value="">Todas as Categorias</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>

        <div className="md:w-48">
          <select 
            value={filtroDisponibilidade}
            onChange={(e) => setFiltroDisponibilidade(e.target.value)}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-gray-700 bg-white"
          >
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
            {(produtosFiltrados.length === 0) && !erroApi ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((produto) => (
                <tr key={produto.id} className="hover:bg-destaque transition-colors group border-b border-gray-100 last:border-0">
                  <td className="p-4">
                    <img 
                      src={produto.imagem || DEFAULT_IMAGE} 
                      alt={produto.nome} 
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-gray-50"
                    />
                  </td>
                  <td className="p-4 font-bold text-header">{produto.nome}</td>
                  <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={produto.descricao}>
                    {produto.descricao || "-"}
                  </td>
                  <td className="p-4 text-gray-600">{produto.categoria?.nome}</td>
                  <td className="p-4 text-gray-600">{Number(produto.preco_unitario).toFixed(2)}</td>
                  <td className="p-4">
                    {produto.disponivel ? (
                      <span className="text-emerald-600 font-bold">Disponível</span>
                    ) : (
                      <span className="text-red-500 font-bold">Esgotado</span>
                    )}
                  </td>
                  <td className="p-4 text-center space-x-4">
                    <button 
                      onClick={() => abrirModalEdicao(produto)}
                      className="text-gray-400 hover:text-hover transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => confirmarExclusao(produto)}
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

      {produtoParaExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque p-8 rounded-xl w-full max-w-md shadow-2xl text-center border-t-4 border-red-500">
            <h3 className="text-2xl font-bold text-header mb-3 font-header">Excluir Produto?</h3>
            <p className="text-header/80 mb-8">
              Esta ação não pode ser desfeita. Tem certeza que deseja excluir <strong>{produtoParaExcluir.nome}</strong>?
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setProdutoParaExcluir(null)} 
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

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8">
            <button 
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl transition-colors cursor-pointer z-10"
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-header font-header">
              {editandoId ? "Editar Produto" : "Novo Produto"}
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* COLUNA ESQUERDA: FOTO */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <label className="block text-sm font-bold text-header">Foto do Produto</label>
                <div className="relative group w-full aspect-square bg-gray-200/60 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center shadow-inner">
                  <img 
                    src={previewImagem} 
                    alt="Preview Produto" 
                    className="w-full h-full object-cover"
                  />
                  <label htmlFor="imagem-upload" className="absolute inset-0 bg-black/40 text-white font-bold opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity cursor-pointer text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    </svg>
                    Alterar Foto
                  </label>
                </div>
                <input 
                  id="imagem-upload"
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  name="imagem" 
                  onChange={handleChange} 
                  className="hidden"
                />
                <p className="text-xs text-gray-500 text-center">Formatos aceitos: PNG, JPG ou WEBP.</p>
              </div>

              {/* COLUNA DIREITA: DADOS */}
              <div className="md:col-span-7 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-bold mb-2 text-header">Nome do Produto</label>
                  <input required name="nome" value={formData.nome} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header" />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-header">Descrição</label>
                  <textarea 
                    name="descricao" 
                    value={formData.descricao} 
                    onChange={handleChange} 
                    rows="3"
                    placeholder="Ingredientes e detalhes..."
                    className="w-full border border-gray-300 p-3 rounded-md resize-none focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header" 
                  />
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-bold mb-2 text-header">Preço (R$)</label>
                    <input required type="number" min="0.01" step="0.01" name="preco_unitario" value={formData.preco_unitario} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-bold mb-2 text-header">Categoria</label>
                    <select required name="categoria_id" value={formData.categoria_id} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header">
                      <option value="">Selecione...</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {categoriaSelecionada?.tipo_categoria === "PRATO" && (
                  <div className="flex gap-4 bg-white p-4 rounded-md border border-gray-200">
                    <div className="w-1/2">
                      <label className="block text-sm font-bold mb-2 text-header">Peso (g)</label>
                      <input type="number" min="1" name="peso" required value={formData.peso} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover text-header" />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-bold mb-2 text-header">Preparo (min)</label>
                      <input type="number" min="1" name="tempo_preparo_minutos" required value={formData.tempo_preparo_minutos} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover text-header" />
                    </div>
                  </div>
                )}

                {categoriaSelecionada?.tipo_categoria === "BEBIDA" && (
                  <div className="flex gap-4 bg-white p-4 rounded-md border border-gray-200">
                    <div className="w-1/2">
                      <label htmlFor="teor-alcoolico" className="block text-sm font-bold mb-2 text-header">Teor alcoólico (%)</label>
                      <input 
                        id="teor-alcoolico"
                        required
                        type="number" 
                        min="0" 
                        max="100"
                        step="0.1" 
                        name="teor_alcoolico" 
                        value={formData.teor_alcoolico}
                        onChange={handleChange} 
                        aria-describedby="teor-alcoolico-ajuda"
                        className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover text-header"
                      />
                      <p id="teor-alcoolico-ajuda" className="mt-1 text-xs text-gray-500">Informe 0 para bebidas sem álcool.</p>
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-bold mb-2 text-header">Volume (ml)</label>
                      <input type="number" min="1" name="volume_ml" value={formData.volume_ml} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover text-header" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-1">
                  <input type="checkbox" id="disponivel" name="disponivel" checked={formData.disponivel} onChange={handleChange} className="w-5 h-5 cursor-pointer accent-hover" />
                  <label htmlFor="disponivel" className="font-bold cursor-pointer text-header">
                    Produto Disponível para Venda?
                  </label>
                </div>

                <div className="flex justify-end gap-4 mt-2 pt-4 border-t border-header/10">
                  <button type="button" onClick={() => setModalAberto(false)} className="bg-white text-header px-6 py-3 rounded-md font-bold hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-hover text-header px-6 py-3 rounded-md font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer">
                    {editandoId ? "Atualizar Produto" : "Salvar Produto"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
