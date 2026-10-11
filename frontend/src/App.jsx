import { useState } from "react";
import Sidebar from "./components/Sidebar";
import CardProduto from "./components/CardProduto";

const cerveja = {
  id: 1,
  nome: "Cerveja Pilsen",
  descricao: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris eu bibendum augue. Sed consectetur tincidunt neque, ac dapibus metus sollicitudin quis. Integer condimentum nisi nunc, nec pellentesque magna feugiat at. Vestibulum rhoncus eleifend fringilla. Quisque vitae justo sit amet ipsum pretium tristique. Nulla et ex fringilla, suscipit metus ac, maximus ex.",
  imagem: "/media/itens/pilsen.jpg",
  volume_ml: 350,
  preco_unitario: "8.50",
};

export default function App() {
  const [paginaAtual, setPaginaAtual] = useState("/");
  const [categoriaAtual, setCategoriaAtual] = useState("");

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
              {categoriaAtual === "bebidas" ? "Bebidas" : "Cardápio"}
            </h1>

            {categoriaAtual === "bebidas" && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
                <CardProduto produto={cerveja} />
              </div>
            )}
          </>
        )}

        {paginaAtual === "/promocoes" && <h1>Promoções</h1>}
        {paginaAtual === "/comanda" && <h1>Comanda</h1>}
      </main>
    </>
  );
}
