import { useEffect, useState } from "react";
import { FormAberturaComanda } from "./components/FormAberturaComanda";
import Sidebar from "./components/Sidebar";
import Bebidas from "./pages/Bebidas";
import Comidas from "./pages/Comidas";
import Comanda from "./pages/Comanda";
import Configuracoes from "./pages/Configuracoes";
import PainelGerente from "./pages/PainelGerente";
import { SidebarGerente } from "./components/SidebarGerente";
import Usuarios from "./pages/gerente/Usuarios";
import Mesas from "./pages/gerente/Mesas";
import Categorias from "./pages/gerente/Categorias";
import Produtos from "./pages/gerente/Produtos";
import Promocoes from "./pages/gerente/Promocoes";
import Comandas from "./pages/gerente/Comandas";
import PainelGarcom from "./pages/garcom/PainelGarcom";
import SolicitacoesGarcom from "./pages/garcom/SolicitacoesGarcom";
import PedidosGarcom from "./pages/garcom/PedidosGarcom";
import { SidebarGarcom } from "./components/SidebarGarcom";

const telasGerente = {
  "/gerente": <PainelGerente />,
  "/gerente/usuarios": <Usuarios />,
  "/gerente/mesas": <Mesas />,
  "/gerente/categorias": <Categorias />,
  "/gerente/produtos": <Produtos />,
  "/gerente/promocoes": <Promocoes />,
  "/gerente/comandas": <Comandas />,
};

const telasGarcom = {
  "/garcom": <PainelGarcom />,
  "/garcom/solicitacoes": <SolicitacoesGarcom />,
  "/garcom/pedidos": <PedidosGarcom />,
};

export default function App() {
  // Lê a rota atual da URL do navegador
  const [paginaAtual, setPaginaAtual] = useState(window.location.pathname);
  const [categoriaAtual, setCategoriaAtual] = useState("bebidas");
  const [itensComanda, setItensComanda] = useState([]);

  
async function chamarGarcom() {
  try {
    const idComanda = localStorage.getItem("id_comanda");

    if (!idComanda) {
      alert("Não foi possível identificar a comanda.");
      return;
    }

    const resposta = await fetch("/api/solicitacoes/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo: "ATENDIMENTO",
        comanda: Number(idComanda),
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro ||
        dados.detail ||
        "Não foi possível chamar o garçom."
      );
    }

    alert("Solicitação enviada! Aguarde o garçom.");
  } catch (erro) {
    alert(erro.message || "Erro ao conectar com o servidor.");
  }
}


  // consulta a API, qunado a tela de comanda é aberta
  useEffect(() => {
    if (paginaAtual !== "/comanda") return;

    const buscarComanda = async () => {
      try {
        const idMesa = localStorage.getItem("id_mesa_tablet");

        if (!idMesa) {
          setItensComanda([]);
          return;
        }

        const resposta = await fetch( 
          `/api/mesas/${idMesa}/comanda/`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.erro || "Não foi possível consultar a comanda."
          );
        }

        // Junta os itens de todos os pedidos da comanda.
        const itens = (dados.pedidos ?? []).flatMap((pedido) =>
          (pedido.itens ?? []).map((item) => ({
            id: item.id,
            item: { nome: item.nome },
            preco: item.preco_unitario,
            quantidade: item.quantidade,
            status: item.status,
          }))
        );

        setItensComanda(itens);
      } catch (erro) {
        console.error("Erro ao buscar a comanda:", erro);
        setItensComanda([]);
      }
    };

    buscarComanda();

    const intervalo = setInterval(buscarComanda, 5000);

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

  if (Object.hasOwn(telasGerente, paginaAtual)) {
    return (
      <>
        <SidebarGerente paginaAtual={paginaAtual} />
        <main className="ml-64 min-h-screen bg-fundo p-8">
          {telasGerente[paginaAtual]}
        </main>
      </>
    );
  }

  if (Object.hasOwn(telasGarcom, paginaAtual)) {
  return (
    <>
      <SidebarGarcom paginaAtual={paginaAtual} />
      <main className="ml-64 min-h-screen bg-fundo p-8">
        {telasGarcom[paginaAtual]}
      </main>
    </>
  );
}

  // Se já passou possui comanda, exibe a estrutura completa do Cardápio
  return (
    <div className="flex w-full min-h-screen bg-[#F4F0E5]">
      
      <Sidebar
        paginaAtual={paginaAtual}
        onNavegar={setPaginaAtual}
        onSelecionarCategoria={setCategoriaAtual}
        onChamarGarcom={chamarGarcom}
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
