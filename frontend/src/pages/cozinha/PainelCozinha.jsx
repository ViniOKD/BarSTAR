
import { useCallback, useEffect, useState } from "react";
import { requisicaoApi } from "../../utils/api";

export default function PainelCozinha() {
  const [pedidos, setPedidos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("EM_PREPARO");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizando, setAtualizando] = useState([]);

  const buscarPedidos = useCallback(async () => {
    try {
      const resposta = await requisicaoApi("/api/pedidos/", {
        cache: "no-store",
      });

      const lista = Array.isArray(resposta)
        ? resposta
        : resposta.results ?? [];

      setPedidos(lista);
      setErro("");
    } catch (erro) {
      console.error("Erro ao buscar pedidos:", erro);
      setErro("Não foi possível carregar os pedidos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarPedidos();

    const intervalo = setInterval(buscarPedidos, 5000);

    return () => clearInterval(intervalo);
  }, [buscarPedidos]);

  async function marcarComoPronto(itemId) {
    setAtualizando((anteriores) => [...anteriores, itemId]);

    try {
      await requisicaoApi(`/api/itens-pedido/${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PRONTO" }),
      });

      await buscarPedidos();
    } catch (erro) {
    console.error("Erro ao atualizar item:", {
        mensagem: erro.message,
        status: erro.status,
        dados: erro.dados,
    });

    setErro(
        erro.dados?.detail ||
        erro.dados?.erro ||
        erro.message ||
        "Não foi possível atualizar o status do item."
    );
    } finally {
      setAtualizando((anteriores) =>
        anteriores.filter((id) => id !== itemId)
      );
    }
  }

  const pedidosExibidos = [...pedidos]
    .sort(
        (a, b) =>
        new Date(a.data_pedido) - new Date(b.data_pedido)
    )
    .map((pedido) => ({
      ...pedido,
      itens_pedido: (pedido.itens_pedido ?? []).filter(
        (item) => item.status === abaAtiva
      ),
    }))
    .filter((pedido) => pedido.itens_pedido.length > 0);

  const quantidadeEmPreparo = pedidos.reduce(
    (total, pedido) =>
      total +
      (pedido.itens_pedido ?? []).filter(
        (item) => item.status === "EM_PREPARO"
      ).length,
    0
  );

  const quantidadeProntos = pedidos.reduce(
    (total, pedido) =>
      total +
      (pedido.itens_pedido ?? []).filter(
        (item) => item.status === "PRONTO"
      ).length,
    0
  );

  function formatarHorario(data) {
    if (!data) return "--:--";

    return new Date(data).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-header text-3xl font-bold text-header">
          Painel de Preparo
        </h1>
        <p className="mt-1 text-gray-500">
          Acompanhe os pedidos e atualize o andamento do preparo.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-b border-gray-200">
        <button
          onClick={() => setAbaAtiva("EM_PREPARO")}
          className={`border-b-2 px-4 py-3 font-semibold transition ${
            abaAtiva === "EM_PREPARO"
              ? "border-[#D4AF43] text-header"
              : "border-transparent text-gray-500 hover:text-header"
          }`}
        >
          Em preparo ({quantidadeEmPreparo})
        </button>

        <button
          onClick={() => setAbaAtiva("PRONTO")}
          className={`border-b-2 px-4 py-3 font-semibold transition ${
            abaAtiva === "PRONTO"
              ? "border-[#D4AF43] text-header"
              : "border-transparent text-gray-500 hover:text-header"
          }`}
        >
          Prontos ({quantidadeProntos})
        </button>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="py-8 text-center text-gray-500">
          Carregando pedidos...
        </p>
      ) : pedidosExibidos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="font-semibold text-header">
            {abaAtiva === "EM_PREPARO"
              ? "Nenhum item em preparo."
              : "Nenhum item pronto no momento."}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Os pedidos serão atualizados automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {pedidosExibidos.map((pedido) => (
            <div
              key={pedido.id}
              className="rounded-xl border border-[#D4AF43] bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="font-header text-xl font-bold text-header">
                    Mesa {pedido.mesa?.id ?? "--"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Comanda #{pedido.comanda ?? "--"} · Pedido #{pedido.id}
                  </p>
                </div>

                <span className="text-sm text-gray-500">
                  <span className="font-semibold">Horário:</span>{" "}
                  {formatarHorario(pedido.data_pedido)}
                </span>
              </div>

              <div className="space-y-4">
                {pedido.itens_pedido.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-50 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-header">
                          {item.quantidade}x {item.nome}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "PRONTO"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {item.status === "PRONTO"
                            ? "PRONTO"
                            : "EM PREPARO"}
                        </span>
                      </div>

                      {item.observacoes && (
                        <p className="mt-2 text-sm text-gray-500">
                          Observação: {item.observacoes}
                        </p>
                      )}
                    </div>

                    {abaAtiva === "EM_PREPARO" && (
                      <button
                        onClick={() => marcarComoPronto(item.id)}
                        disabled={atualizando.includes(item.id)}
                        className="rounded-lg bg-[#D4AF43] px-4 py-2 font-semibold text-header transition hover:bg-[#c49d32] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {atualizando.includes(item.id)
                          ? "Atualizando..."
                          : "Marcar como pronto"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
