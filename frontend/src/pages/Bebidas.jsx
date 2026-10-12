import { useEffect, useState } from "react";
import CardProduto from "../components/CardProduto";
import FiltroCategorias from "../components/FiltroCategorias";

export default function Bebidas({ onSelecionarProduto }) {
  const [bebidas, setBebidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function carregarBebidas() {
      try {
        const resposta = await fetch("/api/itens/?tipo_categoria=BEBIDA", {
          signal: controller.signal,
        });
        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as bebidas.");
        }
        const itens = await resposta.json();
        setBebidas(itens);
      } catch (erro) {
        if (erro.name !== "AbortError") setErro(erro.message);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    carregarBebidas();
    return () => controller.abort();
  }, []);

  if (carregando) return <p role="status">Carregando bebidas...</p>;
  if (erro) return <p role="alert">{erro}</p>;
  if (bebidas.length === 0) return <p>Nenhuma bebida cadastrada.</p>;

  const categorias = [
    ...new Map(
      bebidas.map((produto) => [produto.categoria.id, produto.categoria])
    ).values(),
  ];
  const bebidasFiltradas = bebidas.filter(
    (produto) =>
      categoriaSelecionada === "" ||
      produto.categoria.id === categoriaSelecionada
  );

  return (
    <>
      <FiltroCategorias
        categorias={categorias}
        categoriaAtual={categoriaSelecionada}
        onSelecionar={setCategoriaSelecionada}
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
        {bebidasFiltradas.map((produto) => (
          <CardProduto key={produto.id} produto={produto} onClick={onSelecionarProduto} />
        ))}
      </div>

      {bebidasFiltradas.length === 0 && (
        <p>Nenhuma bebida nesta categoria.</p>
      )}
    </>
  );
}
