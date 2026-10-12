import { useEffect, useState } from "react";
import CardProduto from "./CardProduto";
import FiltroCategorias from "./FiltroCategorias";
import ModalProduto from "./ModalProduto";

const intervaloAtualizacao = 500;

export default function CardapioProdutos({ tipoCategoria, nomePagina }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let temporizador;

    async function carregarProdutos() {
      try {
        const parametros = new URLSearchParams({
          tipo_categoria: tipoCategoria,
          disponivel: "true",
        });
        const resposta = await fetch(`/api/itens/?${parametros}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!resposta.ok) {
          throw new Error("Não foi possível atualizar o cardápio. Tentando novamente...");
        }
        const itens = await resposta.json();
        if (controller.signal.aborted) return;

        setProdutos(itens);
        setErro("");
        // Se a categoria ou o produto sumirem, não mantém uma seleção antiga.
        setCategoriaSelecionada((atual) =>
          itens.some((item) => item.categoria.id === atual) ? atual : ""
        );
        setProdutoSelecionado((atual) =>
          atual ? itens.find((item) => item.id === atual.id) || null : null
        );
      } catch {
        if (!controller.signal.aborted) {
          setErro("Não foi possível atualizar o cardápio. Tentando novamente...");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
          // Agenda depois da resposta para não acumular requisições.
          temporizador = setTimeout(carregarProdutos, intervaloAtualizacao);
        }
      }
    }

    carregarProdutos();
    return () => {
      controller.abort();
      clearTimeout(temporizador);
    };
  }, [tipoCategoria]);

  if (carregando) return <p role="status">Carregando {nomePagina}...</p>;

  const categorias = [
    ...new Map(
      produtos.map((produto) => [produto.categoria.id, produto.categoria])
    ).values(),
  ];
  const produtosFiltrados = produtos.filter(
    (produto) => categoriaSelecionada === "" || produto.categoria.id === categoriaSelecionada
  );

  return (
    <>
      {erro && <p role="alert" className="mb-4">{erro}</p>}

      {produtos.length > 0 ? (
        <>
          <FiltroCategorias
            categorias={categorias}
            categoriaAtual={categoriaSelecionada}
            onSelecionar={setCategoriaSelecionada}
          />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
            {produtosFiltrados.map((produto) => (
              <CardProduto key={produto.id} produto={produto} onClick={setProdutoSelecionado} />
            ))}
          </div>
        </>
      ) : (
        !erro && <p>Nenhum item disponível em {nomePagina}.</p>
      )}

      {produtoSelecionado && (
        <ModalProduto
          key={produtoSelecionado.id}
          produto={produtoSelecionado}
          onFechar={() => setProdutoSelecionado(null)}
        />
      )}
    </>
  );
}
