import { useEffect, useState } from "react";
import CardProduto from "../components/CardProduto";
import FiltroCategorias from "../components/FiltroCategorias";

export default function Comidas({ onSelecionarProduto }) {
  const [comidas, setComidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function carregarComidas() {
      try {
        const resposta = await fetch("/api/itens/?tipo_categoria=PRATO", {
          signal: controller.signal,
        });
        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as comidas.");
        }
        const itens = await resposta.json();
        setComidas(itens);
      } catch (erro) {
        if (erro.name !== "AbortError") setErro(erro.message);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    carregarComidas();
    return () => controller.abort();
  }, []);

  if (carregando) return <p role="status">Carregando comidas...</p>;
  if (erro) return <p role="alert">{erro}</p>;
  if (comidas.length === 0) return <p>Nenhuma comida cadastrada.</p>;

  const categorias = [
    ...new Map(
      comidas.map((produto) => [produto.categoria.id, produto.categoria])
    ).values(),
  ];
  const comidasFiltradas = comidas.filter(
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
        {comidasFiltradas.map((produto) => (
          <CardProduto key={produto.id} produto={produto} onClick={onSelecionarProduto} />
        ))}
      </div>

      {comidasFiltradas.length === 0 && (
        <p>Nenhuma comida nesta categoria.</p>
      )}
    </>
  );
}
