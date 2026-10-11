import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Bebidas from "./pages/Bebidas";
import Comidas from "./pages/Comidas";
import ModalProduto from "./components/ModalProduto";

export default function App() {
  const [paginaAtual, setPaginaAtual] = useState("/");
  const [categoriaAtual, setCategoriaAtual] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  return (
    <>
      <Sidebar
        paginaAtual={paginaAtual}
        onNavegar={setPaginaAtual}
        onSelecionarCategoria={setCategoriaAtual}
      />

      <main className="ml-64 p-6">
        {paginaAtual === "/" && <h1>Início</h1>}

        {paginaAtual === "/cardapio" && (
          <>
            <h1 className="mb-6 font-header text-2xl font-bold text-header">
              {categoriaAtual === "bebidas"
                ? "Bebidas"
                : categoriaAtual === "comidas"
                  ? "Comidas"
                  : "Cardápio"}
            </h1>

            {categoriaAtual === "bebidas" && <Bebidas onSelecionarProduto={setProdutoSelecionado} />}
            {categoriaAtual === "comidas" && <Comidas onSelecionarProduto={setProdutoSelecionado} />}
          </>
        )}

        {paginaAtual === "/promocoes" && <h1>Promoções</h1>}
        {paginaAtual === "/comanda" && <h1>Comanda</h1>}
      </main>
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
