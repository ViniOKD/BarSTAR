import { useState, useEffect } from "react";

// Funções para formatar data e hora separadamente
function formatarApenasData(dataIso) {
  if (!dataIso) return "-";
  const data = new Date(dataIso);
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarApenasHora(dataIso) {
  if (!dataIso) return "-";
  const data = new Date(dataIso);
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataHora(dataIso) {
    if (!dataIso) return "-";
    const data = new Date(dataIso);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
}

export default function Historico() {
  const [comandas, setComandas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState(null);

  // Estados para a barra de filtros
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    mesa: "",
    garcom: "",
  });

  // Estado para o Modal de Detalhes
  const [comandaSelecionada, setComandaSelecionada] = useState(null);

  // Mudar este número faz a busca rodar de novo (botão de atualizar).
  const [recarga, setRecarga] = useState(0);

  // Busca o histórico ao abrir a tela e sempre que os filtros mudam.
  useEffect(() => {
    async function buscarHistorico() {
      try {
        const params = new URLSearchParams();
        if (filtros.dataInicio) params.append("data_inicio", filtros.dataInicio);
        if (filtros.dataFim) params.append("data_fim", filtros.dataFim);
        if (filtros.mesa) params.append("mesa", filtros.mesa);
        if (filtros.garcom) params.append("garcom", filtros.garcom);

        const resposta = await fetch(`/api/historico/comandas/?${params.toString()}`);

        if (resposta.ok) {
          const dados = await resposta.json();
          setComandas(dados.results ? dados.results : dados);
          setErroApi(null);
        } else {
          setErroApi(`Erro no servidor ao carregar o histórico (${resposta.status}).`);
        }
      } catch {
        setErroApi("Erro de Conexão. O React não conseguiu alcançar o Django.");
      } finally {
        setCarregando(false);
      }
    }

    buscarHistorico();
  }, [filtros, recarga]);

  const handleChangeFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({ dataInicio: "", dataFim: "", mesa: "", garcom: "" });
  };

  if (carregando && comandas.length === 0) {
    return <p className="text-header font-bold p-4">Buscando histórico no servidor...</p>;
  }

  return (
    <div className="relative pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">
          Histórico de Comandas
        </h1>
      </div>

      {erroApi && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p className="font-bold">Aviso de Comunicação API:</p>
          <p>{erroApi}</p>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-bold mb-1 text-header">Data Início</label>
          <input 
            type="date" 
            name="dataInicio"
            value={filtros.dataInicio}
            onChange={handleChangeFiltro}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-header bg-white"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-bold mb-1 text-header">Data Fim</label>
          <input 
            type="date" 
            name="dataFim"
            value={filtros.dataFim}
            onChange={handleChangeFiltro}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-header bg-white"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-bold mb-1 text-header">Número da Mesa</label>
          <input 
            type="number" 
            min="1"
            name="mesa"
            placeholder="Ex: 5"
            value={filtros.mesa}
            onChange={handleChangeFiltro}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-header bg-white"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-bold mb-1 text-header">Nome do Garçom</label>
          <input 
            type="text" 
            name="garcom"
            placeholder="Ex: João"
            value={filtros.garcom}
            onChange={handleChangeFiltro}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-header bg-white"
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={limparFiltros}
            className="bg-white hover:bg-gray-100 border border-gray-300 text-header px-4 py-2.5 rounded-md font-bold transition-colors cursor-pointer w-full lg:w-auto"
          >
            Limpar
          </button>
          <button 
            onClick={() => setRecarga((atual) => atual + 1)}
            className="bg-hover hover:opacity-90 text-header px-6 py-2.5 rounded-md font-bold shadow-sm transition-opacity cursor-pointer w-full lg:w-auto"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* TABELA DE LISTAGEM */}
      <div className="bg-destaque rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-white">
              <th className="p-4 text-header font-bold">Comanda ID</th>
              <th className="p-4 text-header font-bold">Fechamento</th>
              <th className="p-4 text-header font-bold">Mesa</th>
              <th className="p-4 text-header font-bold">Garçom</th>
              <th className="p-4 text-header font-bold">Total (R$)</th>
              <th className="p-4 text-header font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {comandas.length === 0 && !carregando ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-header">
                  Nenhuma comanda encontrada para estes filtros.
                </td>
              </tr>
            ) : (
              comandas.map((comanda) => (
                <tr key={comanda.id} className="hover:bg-fundo transition-colors group border-b border-gray-100 last:border-0 bg-white">
                  <td className="p-4 font-bold text-header">{comanda.id}</td>
                  <td className="p-4 text-header">{formatarDataHora(comanda.data_fechamento)}</td>
                  <td className="p-4 text-header">{comanda.mesa_numero}</td>
                  <td className="p-4 text-header">{comanda.garcom_nome || "Não registrado"}</td>
                  <td className="p-4 font-bold text-emerald-600">R$ {comanda.total}</td>
                  <td className="p-4 text-center space-x-4">
                    <button 
                      onClick={() => setComandaSelecionada(comanda)}
                      className="text-gray-400 hover:text-hover transition-colors cursor-pointer"
                      title="Ver Detalhes"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 inline">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* MODAL DE DETALHES PADRONIZADO */}
      {comandaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-destaque p-8 shadow-xl max-h-[95vh] flex flex-col">
            
            {/* Cabeçalho do Modal */}
            <div className="mb-6 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold text-header font-header">
                Detalhes da Comanda {comandaSelecionada.id}
              </h2>
              <button
                onClick={() => setComandaSelecionada(null)}
                className="text-gray-400 transition-colors hover:text-header font-bold text-xl cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Informações Gerais */}
            <div className="mb-8 flex flex-wrap gap-x-12 gap-y-4 shrink-0">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Mesa</p>
                <p className="font-bold text-header text-lg">{comandaSelecionada.mesa_numero}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Garçom</p>
                <p className="font-bold text-header text-lg">{comandaSelecionada.garcom_nome || "Não registrado"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Abertura</p>
                <div className="font-bold text-header">
                    <div>{formatarApenasData(comandaSelecionada.data_abertura)}</div>
                    <div className="text-sm text-gray-600">{formatarApenasHora(comandaSelecionada.data_abertura)}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Fechamento</p>
                <div className="font-bold text-header">
                    {comandaSelecionada.data_fechamento ? (
                        <>
                            <div>{formatarApenasData(comandaSelecionada.data_fechamento)}</div>
                            <div className="text-sm text-gray-600">{formatarApenasHora(comandaSelecionada.data_fechamento)}</div>
                        </>
                    ) : (
                        "-"
                    )}
                </div>
              </div>
            </div>

            {/* Tabela de Itens Consumidos */}
            <div className="mb-6 overflow-hidden flex flex-col flex-1">
              <h3 className="mb-3 font-bold text-header shrink-0">Itens Consumidos</h3>
              <div className="overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-header">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold z-10">
                    <tr>
                      <th className="px-4 py-3">ITEM</th>
                      <th className="px-4 py-3 text-center">QTD</th>
                      <th className="px-4 py-3 text-right">PREÇO UNIT.</th>
                      <th className="px-4 py-3 text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandaSelecionada.pedidos?.flatMap(pedido => pedido.itens_pedido).length > 0 ? (
                        comandaSelecionada.pedidos?.map((pedido) => 
                        pedido.itens_pedido?.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-fundo transition-colors">
                            <td className="px-4 py-3 font-semibold">
                                {item.nome_item_registrado || "Item Removido"}
                                {item.nome_promocao_registrada && (
                                <span className="block text-xs text-hover font-bold mt-0.5">
                                    Promoção: {item.nome_promocao_registrada}
                                </span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-center font-medium">{item.quantidade}</td>
                            <td className="px-4 py-3 text-right font-medium">R$ {Number(item.preco).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold">
                                R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                            </td>
                            </tr>
                        ))
                        )
                    ) : (
                        <tr>
                            <td colSpan="4" className="px-4 py-4 text-center text-gray-500 font-medium">
                                Nenhum item registrado.
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé: Total e Botões */}
            <div className="flex items-center justify-between mt-4 shrink-0">
              <p className="text-lg font-bold text-header flex items-center gap-2 font-header">
                Total da Comanda: <span className="text-2xl text-emerald-600">R$ {comandaSelecionada.total}</span>
              </p>
              
              <div className="flex gap-3">
                 <button
                    onClick={() => setComandaSelecionada(null)}
                    className="rounded-lg bg-hover px-6 py-2.5 font-bold text-header transition-opacity hover:opacity-90 focus:outline-none shadow-sm cursor-pointer"
                >
                    Fechar Detalhes
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}