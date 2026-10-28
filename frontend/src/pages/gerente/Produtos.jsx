import { useState, useEffect } from "react";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState(null); 
  const [modalAberto, setModalAberto] = useState(false);
  const [formData, setFormData] = useState({
    nome: "", descricao: "", preco_unitario: "", categoria_id: "", disponivel: true,
    peso: "", tempo_preparo_minutos: "", ponto_carne: "", teor_alcoolico: "", volume_ml: ""
  });

  const buscarDados = async () => {
    try {
      setErroApi(null);
      
      // Vamos tentar manter a mesma URL que usamos no App.jsx (sem o localhost fixo)
      // para evitar problemas de CORS, assumindo que o Vite está configurado como proxy.
      const [respostaProdutos, respostaCategorias] = await Promise.all([
        fetch("/api/itens/"),
        fetch("/api/categorias/")
      ]);

      if (respostaProdutos.ok && respostaCategorias.ok) {
        const dadosProd = await respostaProdutos.json();
        const dadosCat = await respostaCategorias.json();
        
        // CORREÇÃO AQUI: Verifica se os dados vieram dentro de 'results' (paginação do Django)
        // Se vieram em results, usamos dadosProd.results, senão usamos dadosProd direto
        const itensFormatados = dadosProd.results ? dadosProd.results : dadosProd;
        const categoriasFormatadas = dadosCat.results ? dadosCat.results : dadosCat;

        // Vamos colocar no console apenas para termos certeza se carregou algo
        console.log("Itens carregados:", itensFormatados);
        
        setProdutos(itensFormatados);
        setCategorias(categoriasFormatadas);
      } else {
        setErroApi(`Erro do Servidor. Produtos: Status ${respostaProdutos.status}. Categorias: Status ${respostaCategorias.status}.`);
      }
    } catch (erro) {
      setErroApi("Erro de Conexão. O React não conseguiu alcançar o Django.");
      console.error("Detalhes do erro:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDados();
  }, []);

  const categoriaSelecionada = categorias.find(
    (c) => String(c.id) === String(formData.categoria_id)
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Number(formData.preco_unitario) <= 0) {
      alert("O preço deve ser maior que zero!");
      return;
    }

    const dadosParaEnviar = {
      nome: formData.nome,
      descricao: formData.descricao,
      preco_unitario: Number(formData.preco_unitario),
      categoria_id: Number(formData.categoria_id),
      disponivel: formData.disponivel,
      gerente: 1 
    };

    if (categoriaSelecionada?.tipo_categoria === "PRATO") {
      dadosParaEnviar.peso = Number(formData.peso);
      dadosParaEnviar.tempo_preparo_minutos = Number(formData.tempo_preparo_minutos);
      if (formData.ponto_carne) dadosParaEnviar.ponto_carne = formData.ponto_carne;
    } else if (categoriaSelecionada?.tipo_categoria === "BEBIDA") {
      dadosParaEnviar.teor_alcoolico = Number(formData.teor_alcoolico);
      dadosParaEnviar.volume_ml = Number(formData.volume_ml);
    }

    try {
      const resposta = await fetch("/api/itens/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaEnviar)
      });

      if (resposta.ok) {
        alert("Produto cadastrado com sucesso!");
        setModalAberto(false);
        buscarDados(); 
      } else {
        const erros = await resposta.json();
        alert("Erro ao salvar! Veja o console para detalhes.");
        console.error("Erros do Django:", erros);
      }
    } catch (erro) {
      console.error("Erro na requisição:", erro);
    }
  };

  if (carregando) return <p className="text-gray-500">Buscando dados no servidor...</p>;

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header">Gestão de Produtos</h1>
        <button 
          onClick={() => setModalAberto(true)}
          className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
        >
          + Novo Produto
        </button>
      </div>

      {erroApi && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p className="font-bold">Aviso de Comunicação API:</p>
          <p>{erroApi}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 border-b">Nome</th>
              <th className="p-4 border-b">Preço (R$)</th>
              <th className="p-4 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {(!Array.isArray(produtos) || produtos.length === 0) && !erroApi ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              produtos.map((produto) => (
                <tr key={produto.id} className="hover:bg-gray-50">
                  <td className="p-4 border-b">{produto.nome}</td>
                  <td className="p-4 border-b">{Number(produto.preco_unitario).toFixed(2)}</td>
                  <td className="p-4 border-b">
                    {produto.disponivel ? (
                      <span className="text-green-600 font-bold">Disponível</span>
                    ) : (
                      <span className="text-red-600 font-bold">Esgotado</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4">Novo Produto</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Nome do Produto</label>
                <input required name="nome" value={formData.nome} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-bold mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" name="preco_unitario" value={formData.preco_unitario} onChange={handleChange} className="w-full border p-2 rounded" />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-bold mb-1">Categoria</label>
                  <select required name="categoria_id" value={formData.categoria_id} onChange={handleChange} className="w-full border p-2 rounded">
                    <option value="">Selecione...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {categoriaSelecionada?.tipo_categoria === "PRATO" && (
                <div className="flex gap-4 bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="w-1/2">
                    <label className="block text-sm font-bold mb-1 text-gray-700">Peso (g)</label>
                    <input required type="number" name="peso" value={formData.peso} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-bold mb-1 text-gray-700">Preparo (min)</label>
                    <input required type="number" name="tempo_preparo_minutos" value={formData.tempo_preparo_minutos} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                </div>
              )}

              {categoriaSelecionada?.tipo_categoria === "BEBIDA" && (
                <div className="flex gap-4 bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="w-1/2">
                    <label className="block text-sm font-bold mb-1 text-gray-700">Teor Alc. (%)</label>
                    <input required type="number" step="0.1" name="teor_alcoolico" value={formData.teor_alcoolico} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-bold mb-1 text-gray-700">Volume (ml)</label>
                    <input required type="number" name="volume_ml" value={formData.volume_ml} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="disponivel" checked={formData.disponivel} onChange={handleChange} className="w-5 h-5 cursor-pointer" />
                <label className="font-bold cursor-pointer" onClick={() => setFormData({...formData, disponivel: !formData.disponivel})}>
                  Produto Disponível para Venda?
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button type="button" onClick={() => setModalAberto(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition-colors">
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}