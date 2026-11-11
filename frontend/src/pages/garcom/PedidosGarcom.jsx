
import { useEffect, useRef, useState } from "react";
import { requisicaoApi } from "../../utils/api";

export default function PedidosGarcom() {
  const [pedidos, setPedidos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("pendentes");
  const [carregando, setCarregando] = useState(true);
  const [atualizandoId, setAtualizandoId] = useState(null);
  const [erro, setErro] = useState("");

  // Guarda os status anteriores dos itens para detectar novidades.
  const statusItensConhecidos = useRef(null);

  async function tocarSom() {
    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      const contexto = new AudioContext();
      await contexto.resume();

      const oscilador = contexto.createOscillator();
      const volume = contexto.createGain();

      oscilador.connect(volume);
      volume.connect(contexto.destination);

      oscilador.frequency.value = 880;
      volume.gain.value = 0.2;

      oscilador.start();
      oscilador.stop(contexto.currentTime + 0.3);

      oscilador.onended = () => contexto.close();
    } catch (erro) {
      console.error("Não foi possível reproduzir o som:", erro);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function buscarPedidos() {
      try {
        const dados = await requisicaoApi("/api/pedidos/", {
          cache: "no-store",
        });

        const lista = Array.isArray(dados)
          ? dados
          : dados.results ?? [];

        // Registra o status atual de todos os itens.
        const novosStatus = new Map();

        lista.forEach((pedido) => {
          (pedido.itens_pedido ?? []).forEach((item) => {
            novosStatus.set(item.id, item.status);
          });
        });

        // Na primeira consulta, apenas registra os status existentes.
        if (statusItensConhecidos.current === null) {
          statusItensConhecidos.current = novosStatus;
        } else {
          const statusAnteriores = statusItensConhecidos.current;

          // Verifica se algum item novo ficou pronto.
          const itemFicouPronto = [...novosStatus.entries()].some(
            ([id, status]) =>
              status === "PRONTO" &&
              statusAnteriores.get(id) !== "PRONTO"
          );

          if (itemFicouPronto) {
            tocarSom();
          }

          statusItensConhecidos.current = novosStatus;
        }

        const pedidosFiltrados = lista
          .map((pedido) => ({
            ...pedido,
            itens_pedido: (pedido.itens_pedido ?? []).filter(
              (item) =>
                item.status === "PRONTO" ||
                item.status === "ENTREGUE"
            ),
          }))
          .filter((pedido) => pedido.itens_pedido.length > 0);

        if (ativo) {
          setPedidos(pedidosFiltrados);
          setErro("");
        }
      } catch (erro) {
        if (ativo) {
          setErro(
            erro.message || "Não foi possível buscar os pedidos."
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    buscarPedidos();

    const intervalo = setInterval(buscarPedidos, 5000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  async function marcarComoEntregue(itemId) {
    setAtualizandoId(itemId);
    setErro("");

    try {
      await requisicaoApi(`/api/itens-pedido/${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ENTREGUE" }),
      });

      setPedidos((atuais) =>
        atuais.map((pedido) => ({
          ...pedido,
          itens_pedido: pedido.itens_pedido.map((item) =>
            item.id === itemId
              ? { ...item, status: "ENTREGUE" }
              : item
          ),
        }))
      );
    } catch (erro) {
      setErro(
        erro.message || "Não foi possível atualizar o item."
      );
    } finally {
      setAtualizandoId(null);
    }
  }

  const pedidosExibidos = pedidos
    .map((pedido) => ({
      ...pedido,
      itens_pedido: pedido.itens_pedido.filter((item) =>
        abaAtiva === "pendentes"
          ? item.status === "PRONTO"
          : item.status === "ENTREGUE"
      ),
    }))
    .filter((pedido) => pedido.itens_pedido.length > 0);

  return (
    <main className="flex flex-col gap-8 text-header">
      <header>
        <h1 className="font-header text-2xl font-bold">
          Pedidos
        </h1>

        <p className="mt-2 font-extralight text-header">
          Acompanhe os itens que precisam ser entregues e os que já foram entregues.
        </p>
      </header>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAbaAtiva("pendentes")}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
            abaAtiva === "pendentes"
              ? "bg-[#D4AF43] text-white"
              : "border border-[#D4AF43] text-header"
          }`}
        >
          Aguardando entrega
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva("entregues")}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
            abaAtiva === "entregues"
              ? "bg-[#D4AF43] text-white"
              : "border border-[#D4AF43] text-header"
          }`}
        >
          Entregues
        </button>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700"
        >
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="font-extralight text-header">
          Carregando pedidos...
        </p>
      ) : pedidosExibidos.length === 0 ? (
        <div className="w-full rounded-xl border border-[#D4AF43] p-5">
          <p className="font-semibold text-header">
            {abaAtiva === "pendentes"
              ? "Nenhum item aguardando entrega."
              : "Nenhum item entregue ainda."}
          </p>

          <p className="mt-2 font-extralight text-header">
            {abaAtiva === "pendentes"
              ? "Os itens aparecerão aqui quando a cozinha finalizar o preparo."
              : "Os itens que você marcar como entregues aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pedidosExibidos.map((pedido) => (
            <article
              key={pedido.id}
              className="w-full rounded-xl border border-[#D4AF43] p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-header text-lg font-semibold text-header">
                    Mesa {pedido.mesa?.id ?? "—"}
                  </h2>

                  <p className="mt-1 font-extralight text-header">
                    Pedido #{pedido.id}
                  </p>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    abaAtiva === "pendentes"
                      ? "bg-[#D4AF43]/20 text-header"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {pedido.itens_pedido.length}{" "}
                  {pedido.itens_pedido.length === 1 ? "item" : "itens"}
                  {abaAtiva === "pendentes"
                    ? " pronto(s)"
                    : " entregue(s)"}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {pedido.itens_pedido.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-t border-[#D4AF43]/40 pt-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-header">
                        {item.quantidade}x {item.nome}
                      </p>

                      {item.observacoes && (
                        <p className="mt-2 font-extralight text-header">
                          Observação: {item.observacoes}
                        </p>
                      )}
                    </div>

                    {abaAtiva === "pendentes" ? (
                      <button
                        type="button"
                        onClick={() => marcarComoEntregue(item.id)}
                        disabled={atualizandoId === item.id}
                        className="rounded-full bg-[#D4AF43] px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {atualizandoId === item.id
                          ? "Atualizando..."
                          : "Marcar como entregue"}
                      </button>
                    ) : (
                      <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                        Entregue
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
