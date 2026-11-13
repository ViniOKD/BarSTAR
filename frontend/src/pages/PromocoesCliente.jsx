import { useEffect, useState } from "react";
import CardProduto from "../components/CardProduto";
import ModalProduto from "../components/ModalProduto";

const intervaloAtualizacao = 5000;

// Sub-componente para a área da promoção 
function SecaoPromocao({ promo, onClickProduto }) {
  const [aberto, setAberto] = useState(true);
  const listaItens = promo.itens_promocao || promo.itens || [];

  return (
    <section className="mb-10 flex flex-col">
      {/* Cabeçalho da Promoção */}
      <div className="mb-5 flex items-end justify-between border-b border-gray-300/60 pb-3">
        
    
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h2 className="font-header text-2xl font-bold text-header">
              {promo.nome}
            </h2>
           
            <span className="rounded bg-[#996315] px-2 py-0.5 text-xs font-bold tracking-wide text-white shadow-sm">
              {promo.desconto_percentual}% OFF
            </span>
          </div>
          
          {promo.descricao && (
            <p className="text-sm text-header/70">{promo.descricao}</p>
          )}
          
    
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-600">
            Válido até: {promo.data_fim ? new Date(promo.data_fim).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Data Indefinida"}
          </p>
        </div>

      
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          className="group mb-1 flex shrink-0 items-center gap-1 text-sm font-medium text-header/60 transition-colors hover:text-[#996315]"
        >
          {aberto ? "Ocultar" : "Ver produtos"}
          <svg
            className={`size-4 transition-transform duration-300 ${aberto ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Grid de produtos */}
      {aberto && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
          {listaItens.map((elemento, index) => {
            const produto = elemento.item || elemento;
            
            if (!produto || produto.preco_unitario == null) return null;

            const precoUnitarioNum = Number(produto.preco_unitario);
            const precoAtualNum = produto.preco_atual != null 
              ? Number(produto.preco_atual)
              : precoUnitarioNum * (1 - (promo.desconto_percentual || 0) / 100);

            const produtoComDesconto = {
              ...produto,
              promocao_atual: promo,
              preco_unitario: precoUnitarioNum.toFixed(2),
              preco_atual: precoAtualNum.toFixed(2)
            };

            return (
              <CardProduto 
                key={produto.id || index} 
                produto={produtoComDesconto} 
                onClick={onClickProduto} 
              />
            );
          })}
          
          {listaItens.length === 0 && (
            <p className="px-2 text-sm text-header/60">Nenhum produto cadastrado nesta promoção.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function PromocoesCliente({
  onAdicionarItem,
  itemEmEdicao,
  onAtualizarItem,
  onCancelarEdicao,
}) {
  const [promocoes, setPromocoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let temporizador;

    async function carregarPromocoes() {
      try {
        const resposta = await fetch("/api/promocoes/ativas/", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as promoções.");
        }

        const dados = await resposta.json();
        if (controller.signal.aborted) return;

        const listaPromocoes = dados.results ?? dados ?? [];
        setPromocoes(listaPromocoes);
        setErro("");

        setProdutoSelecionado((atual) => {
          if (!atual) return null;
          for (const promo of listaPromocoes) {
            const itensDaPromo = promo.itens_promocao || promo.itens || [];
            const achou = itensDaPromo.find(ip => {
              const prod = ip.item || ip; 
              return prod.id === atual.id;
            });
            if (achou) return achou.item || achou;
          }
          return null;
        });

      } catch (e) {
        if (!controller.signal.aborted) {
          setErro("Não foi possível carregar as promoções. Tentando novamente...");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
          temporizador = setTimeout(carregarPromocoes, intervaloAtualizacao);
        }
      }
    }

    carregarPromocoes();
    return () => {
      controller.abort();
      clearTimeout(temporizador);
    };
  }, []);

  if (carregando) return <p role="status" className="font-medium text-header/70">Carregando promoções...</p>;

  return (
    <>
      <h1 className="mb-6 font-header text-2xl font-bold text-header">
        Promoções
      </h1>

      {erro && <p role="alert" className="mb-4 text-red-600">{erro}</p>}

      {promocoes.length > 0 ? (
        <div className="flex flex-col">
          {promocoes.map((promo) => (
            <SecaoPromocao 
              key={promo.id} 
              promo={promo} 
              onClickProduto={setProdutoSelecionado} 
            />
          ))}
        </div>
      ) : (
        !erro && <p className="text-header/70">Nenhuma promoção ativa no momento.</p>
      )}

      {(produtoSelecionado || itemEmEdicao) && (
        <ModalProduto
          key={itemEmEdicao?.idItemPedido ?? produtoSelecionado?.id}
          produto={itemEmEdicao || produtoSelecionado}
          itemEmEdicao={itemEmEdicao}
          onFechar={() => {
            setProdutoSelecionado(null);
            onCancelarEdicao?.();
          }}
          onAdicionar={itemEmEdicao ? onAtualizarItem : onAdicionarItem}
        />
      )}
    </>
  );
}