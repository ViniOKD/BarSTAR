import { useState } from "react";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [paginaAtual, setPaginaAtual] = useState("/");

  return (
    <>
      <Sidebar paginaAtual={paginaAtual} onNavegar={setPaginaAtual} />
      <main className="ml-64 p-6">
        {paginaAtual === "/" && <h1>Início</h1>}
        {paginaAtual === "/cardapio" && <h1>Cardápio</h1>}
        {paginaAtual === "/promocoes" && <h1>Promoções</h1>}
        {paginaAtual === "/comanda" && <h1>Comanda</h1>}
      </main>
    </>
  );
}
