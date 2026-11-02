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
import Pedidos from "./components/Pedidos";

const telasGerente = {
  "/gerente": <PainelGerente />,
  "/gerente/usuarios": <Usuarios />,
  "/gerente/mesas": <Mesas />,
  "/gerente/categorias": <Categorias />,
  "/gerente/produtos": <Produtos />,
  "/gerente/promocoes": <Promocoes />,
  "/gerente/comandas": <Comandas />,
};

export default function App() {
  // Lê a rota atual da URL do navegador
  const [paginaAtual, setPaginaAtual] = useState(window.location.pathname);
  const [categoriaAtual, setCategoriaAtual] = useState("bebidas");
  const [itensComanda, setItensComanda] = useState([]);
  const [pedidosAberto, setPedidosAberto] = useState(false);
  const [itensPedido, setItensPedido] = useState([]);
  const [itemEmEdicao, setItemEmEdicao] = useState(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  function adicionarItemPedido(item) {
    setItensPedido((itensAtuais) => [
      ...itensAtuais,
      {
        ...item,
        idItemPedido: crypto.randomUUID(),
      },
    ]);
  }

  function atualizarItemPedido(itemAtualizado) {
    setItensPedido((itensAtuais) =>
      itensAtuais.map((item) =>
        item.idItemPedido === itemAtualizado.idItemPedido
          ? {
              ...item,
              quantidade: itemAtualizado.quantidade,
              observacoes: itemAtualizado.observacoes,
            }
          : item
      )
    );

    setItemEmEdicao(null);
  }

  function removerItemPedido(idItemPedido) {
    setItensPedido((itensAtuais) =>
      itensAtuais.filter(
        (item) => item.idItemPedido !== idItemPedido
      )
    );
  }

  function editarItemPedido(item) {
    setItemEmEdicao(item);
    setCategoriaAtual(
      item.categoria.tipo_categoria === "BEBIDA" ? "bebidas" : "comidas"
    );
    setPedidosAberto(false);
  }

  async function enviarPedido() {
    if (itensPedido.length === 0 || enviandoPedido) return;
    const idComanda = localStorage.getItem("id_comanda");

    if (!idComanda) {
      alert("Não foi possível identificar a comanda.");
      return;
    }

    const dadosPedido = {
      comanda_id: Number(idComanda),
      itens: itensPedido.map((item) => ({
        item_id: item.id,
        quantidade: item.quantidade,
        observacoes: item.observacoes || "",
      })),
    };

    try {
      setEnviandoPedido(true);
      const resposta = await fetch("/api/enviar-pedido/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosPedido),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível enviar o pedido."
        );
      }

      setItensPedido([]);
      setPedidosAberto(false);

      alert("Pedido enviado para preparo!");
    } catch (erro) {
      console.error("Erro ao enviar pedido:", erro);
      alert(erro.message);
    } finally {
      setEnviandoPedido(false);
    }
  }
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
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setPedidosAberto(true)}
              aria-label="Abrir pedidos"
              className="relative flex min-h-11 items-center gap-2 rounded-lg
                        border border-hover bg-white px-4 py-2 font-bold
                        text-header shadow-sm transition-colors
                        hover:bg-destaque focus-visible:outline-2
                        focus-visible:outline-offset-2 focus-visible:outline-hover"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-6"
              >
                <path
                  d="M6 7h15l-2 10H8L6 3H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>

              <span>Pedidos</span>
            </button>
          </div>
        )}

        {/* Conteúdo do Cardápio */}
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
              <Bebidas
                onAdicionarItem={adicionarItemPedido}
                itemEmEdicao={itemEmEdicao?.categoria?.tipo_categoria === "BEBIDA" ? itemEmEdicao : null}
                onAtualizarItem={atualizarItemPedido}
                onCancelarEdicao={() => setItemEmEdicao(null)}
              />
            )}

            {categoriaAtual === "comidas" && (
              <Comidas
                onAdicionarItem={adicionarItemPedido}
                itemEmEdicao={itemEmEdicao?.categoria?.tipo_categoria === "PRATO" ? itemEmEdicao : null}
                onAtualizarItem={atualizarItemPedido}
                onCancelarEdicao={() => setItemEmEdicao(null)}
              />
            )}
          </>
        )}

        {paginaAtual === "/promocoes" && <h1>Promoções</h1>}

        {paginaAtual === "/comanda" && (
          <Comanda itens={itensComanda} />
        )}

        {/* Painel lateral de Pedidos */}
        {paginaAtual === "/cardapio" && (
          <Pedidos
            aberto={pedidosAberto}
            onFechar={() => setPedidosAberto(false)}
            itens={itensPedido}
            onRemoverItem={removerItemPedido}
            onEditarItem={editarItemPedido}
            onEnviar={enviarPedido}
            enviando={enviandoPedido}
          />
        )}

      </main>


    </div>
  );
}
