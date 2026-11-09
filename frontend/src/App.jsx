import { useEffect, useRef, useState } from "react";
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
import { requisicaoApi } from "./utils/api";
import { atualizarPrecosCarrinho, aplicarPrecosAlterados, dadosEnvioPedido } from "./utils/carrinho";

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
  const [atualizandoPedido, setAtualizandoPedido] = useState(false);
  const [erroPedido, setErroPedido] = useState("");
  const [avisoPedido, setAvisoPedido] = useState("");
  const operacaoPedido = useRef(false);

  async function abrirPedidos() {
    if (operacaoPedido.current) return;
    operacaoPedido.current = true;
    setPedidosAberto(true);
    setAtualizandoPedido(true);
    setErroPedido("");
    setAvisoPedido("");
    try {
      const resposta = await requisicaoApi("/api/itens/?disponivel=true", { cache: "no-store" });
      const produtos = resposta.results ?? resposta;
      const atualizadas = atualizarPrecosCarrinho(itensPedido, produtos);
      setItensPedido(atuais => atualizarPrecosCarrinho(atuais, produtos));
      if (atualizadas.some(item => item.disponivel === false)) {
        setAvisoPedido("Há produtos indisponíveis. Remova-os ou atualize os preços antes de enviar.");
      } else if (atualizadas.some((item, indice) =>
        item.preco_atual !== itensPedido[indice].preco_atual ||
        item.promocao_atual?.id !== itensPedido[indice].promocao_atual?.id)) {
        setAvisoPedido("Os preços ou promoções foram atualizados. Confira os valores antes de enviar.");
      }
    } catch {
      setErroPedido("Não foi possível conferir os preços. Atualize os preços para tentar novamente.");
    } finally {
      operacaoPedido.current = false;
      setAtualizandoPedido(false);
    }
  }

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
    if (operacaoPedido.current || itensPedido.length === 0 || erroPedido ||
        itensPedido.some(item => item.disponivel === false)) return;
    const idComanda = localStorage.getItem("id_comanda");

    if (!idComanda) {
      setErroPedido("Não foi possível identificar a comanda. Procure o atendimento.");
      return;
    }

    operacaoPedido.current = true;
    setEnviandoPedido(true);
    setErroPedido("");
    setAvisoPedido("");
    try {
      const idsEnviados = new Set(itensPedido.map(item => item.idItemPedido));
      await requisicaoApi("/api/enviar-pedido/", {
        method: "POST",
        body: JSON.stringify(dadosEnvioPedido(idComanda, itensPedido)),
      });
      setItensPedido(atuais => atuais.filter(item => !idsEnviados.has(item.idItemPedido)));
      setPedidosAberto(false);
      setAvisoPedido("Pedido enviado para preparo!");
    } catch (erro) {
      if (erro.status === 409 && erro.dados?.codigo === "PRECO_ALTERADO") {
        setItensPedido(atuais => aplicarPrecosAlterados(atuais, erro.dados.itens_atualizados));
        setAvisoPedido("Os preços ou promoções mudaram. Confira os novos valores e confirme novamente.");
        try {
          // O conflito não contém o preço normal atualizado; recarrega o cadastro antes da confirmação.
          const resposta = await requisicaoApi("/api/itens/?disponivel=true", { cache: "no-store" });
          setItensPedido(atuais => atualizarPrecosCarrinho(atuais, resposta.results ?? resposta));
        } catch {
          setErroPedido("Não foi possível conferir os novos preços. Atualize os preços antes de confirmar.");
        }
      } else {
        setErroPedido(erro.message || "Não foi possível enviar o pedido. Tente novamente.");
      }
    } finally {
      operacaoPedido.current = false;
      setEnviandoPedido(false);
    }
  }
  // consulta a API, qunado a tela de comanda é aberta
  useEffect(() => {
    if (paginaAtual !== "/comanda") return;

    const buscarPedidos = async () => {
      try {
        const resposta = await requisicaoApi("/api/pedidos/");
        const pedidos = resposta.results ?? resposta;
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
              onClick={abrirPedidos}
              disabled={atualizandoPedido || enviandoPedido}
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
            {!pedidosAberto && avisoPedido && <p role="status" className="mb-4 rounded-lg border border-hover bg-destaque p-3">{avisoPedido}</p>}
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
            atualizando={atualizandoPedido}
            erro={erroPedido}
            aviso={avisoPedido}
            onAtualizar={abrirPedidos}
          />
        )}

      </main>


    </div>
  );
}
