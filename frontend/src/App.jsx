import { useEffect, useState } from "react";
import { FormAberturaComanda } from "./components/FormAberturaComanda";
import Sidebar from "./components/Sidebar";
import Bebidas from "./pages/Bebidas";
import Comidas from "./pages/Comidas";
import Comanda from "./pages/Comanda";
import Configuracoes from "./pages/Configuracoes";
import PainelGerente from "./pages/PainelGerente";

export default function App() {
  // Lê a rota atual da URL do navegador
  const [paginaAtual, setPaginaAtual] = useState(window.location.pathname);
  const [categoriaAtual, setCategoriaAtual] = useState("bebidas");
  const [itensComanda, setItensComanda] = useState([]);

  // consulta a API, qunado a tela de comanda é aberta
  useEffect(() => {
    if (paginaAtual !== "/comanda") return;

    const buscarPedidos = async () => {
      try {
        const resposta = await fetch("/api/pedidos/");

        if (!resposta.ok) {
          throw new Error("Não foi possível consultar os pedidos.");
        }

        const pedidos = await resposta.json();
        const idComanda = localStorage.getItem('id_comanda');
        const itens = pedidos
          .filter((pedido) => Number(pedido.comanda) === Number(idComanda))
          .flatMap((pedido) => pedido.itens_pedido ?? []);

        setItensComanda(itens);
      } catch (erro) {
        console.error("Erro ao buscar os pedidos:", erro);
      }
    };

    buscarPedidos();

    const intervalo = setInterval(buscarPedidos, 5000);

    return () => clearInterval(intervalo);
  }, [paginaAtual]);

  // Verifica se o usuário está na tela inicial/abertura de comanda
  const isTelaInicial = paginaAtual === "/" || paginaAtual === "/abrir-comanda";

  // Se for a Tela Inicial de Abertura de Comanda
  if (isTelaInicial) {
    return (
      <FormAberturaComanda 
        aoSucesso={() => setPaginaAtual("/cardapio")} 
      />
    );
  }

  if (paginaAtual === "/configuracoes") {
    return <Configuracoes />;
  }

  if (paginaAtual === "/gerente") {
    return <PainelGerente />;
  }

  // Se já passou possui comanda, exibe a estrutura completa do Cardápio
  return (
    <div className="flex w-full min-h-screen bg-[#F4F0E5]">
      
      <Sidebar
        paginaAtual={paginaAtual}
        onNavegar={setPaginaAtual}
        onSelecionarCategoria={setCategoriaAtual}
      />

      <main className="ml-64 flex-1 p-6">
        {paginaAtual === "/cardapio" && (
          <>
            <h1 className="mb-6 font-header text-2xl font-bold text-header">
              {categoriaAtual === "bebidas"
                ? "Bebidas"
                : categoriaAtual === "comidas"
                  ? "Comidas"
                  : "Cardápio"}
            </h1>

            {categoriaAtual === "bebidas" && (
              <Bebidas />
            )}
            {categoriaAtual === "comidas" && (
              <Comidas />
            )}
          </>
        )}

        {paginaAtual === "/promocoes" && <h1>Promoções</h1>}
        {paginaAtual === "/comanda" && <Comanda itens={itensComanda} />}
      </main>

    </div>
  );
}
