import { useEffect, useState } from "react";
import ChaveDisponibilidade from "./ChaveDisponibilidade.jsx";
import { mensagemDoErro, requisicaoApi } from "../utils/api.js";
import { IMAGEM_PADRAO, alterarDisponibilidade } from "../utils/produtos.js";

const intervaloAtualizacao = 5000;

// Lista os produtos de um setor (pratos na cozinha, bebidas no bar) com a
// chave para marcar cada um como disponível ou indisponível.
export default function ListaDisponibilidade({ tipoCategoria, titulo }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [atualizando, setAtualizando] = useState([]);

  // Atualiza periodicamente para refletir mudanças feitas pelo gerente.
  useEffect(() => {
    let ativo = true;
    let temporizador;

    async function buscarProdutos() {
      try {
        const parametros = new URLSearchParams({ tipo_categoria: tipoCategoria });
        const resposta = await requisicaoApi(`/api/itens/?${parametros}`, { cache: "no-store" });
        if (!ativo) return;
        setProdutos(resposta.results ?? resposta);
        setErro("");
      } catch (falha) {
        if (ativo) setErro(mensagemDoErro(falha));
      } finally {
        if (ativo) {
          setCarregando(false);
          // Agenda depois da resposta para não acumular requisições.
          temporizador = setTimeout(buscarProdutos, intervaloAtualizacao);
        }
      }
    }

    buscarProdutos();
    return () => {
      ativo = false;
      clearTimeout(temporizador);
    };
  }, [tipoCategoria]);

  function definirDisponivel(id, disponivel) {
    setProdutos((atuais) =>
      atuais.map((produto) => (produto.id === id ? { ...produto, disponivel } : produto))
    );
  }

  async function alternar(produto, disponivel) {
    setAtualizando((atuais) => [...atuais, produto.id]);
    // Mostra a mudança na hora e desfaz se o servidor recusar.
    definirDisponivel(produto.id, disponivel);
    try {
      const atualizado = await alterarDisponibilidade(produto.id, disponivel);
      definirDisponivel(produto.id, atualizado.disponivel);
      setErro("");
    } catch (falha) {
      definirDisponivel(produto.id, !disponivel);
      setErro(mensagemDoErro(falha));
    } finally {
      setAtualizando((atuais) => atuais.filter((id) => id !== produto.id));
    }
  }

  const termo = busca.trim().toLowerCase();
  const produtosExibidos = produtos
    .filter((produto) => produto.nome.toLowerCase().includes(termo))
    .sort((a, b) =>
      (a.categoria?.nome ?? "").localeCompare(b.categoria?.nome ?? "") || a.nome.localeCompare(b.nome)
    );
  const indisponiveis = produtos.filter((produto) => !produto.disponivel).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-header text-3xl font-bold text-header">{titulo}</h1>
        <p className="mt-1 text-gray-500">
          Itens indisponíveis deixam de aparecer no cardápio e não podem ser pedidos.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Buscar produto por nome..."
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          className="w-full sm:max-w-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-gray-700 bg-white"
        />
        <p className="text-sm text-gray-500">
          {indisponiveis} de {produtos.length} indisponíve{indisponiveis === 1 ? "l" : "is"}
        </p>
      </div>

      {erro && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="py-8 text-center text-gray-500">Carregando produtos...</p>
      ) : produtosExibidos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="font-semibold text-header">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {produtosExibidos.map((produto) => (
            <li key={produto.id} className="flex flex-wrap items-center gap-4 p-4">
              <img
                src={produto.imagem || IMAGEM_PADRAO}
                alt={produto.nome}
                className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-header">{produto.nome}</p>
                <p className="text-sm text-gray-500">{produto.categoria?.nome}</p>
              </div>
              <ChaveDisponibilidade
                disponivel={produto.disponivel}
                desabilitado={atualizando.includes(produto.id)}
                onAlternar={(disponivel) => alternar(produto, disponivel)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
