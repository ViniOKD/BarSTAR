
import { useEffect, useState } from "react";
import { requisicaoApi } from "../../utils/api";

export default function PainelGarcom() {
  const [mesas, setMesas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mesaExpandida, setMesaExpandida] = useState(null);

  // Mudar este número faz a busca rodar de novo (botão "Tentar novamente").
  const [tentativa, setTentativa] = useState(0);

  // Busca as comandas ao abrir a tela e repete a cada 5 segundos.
  useEffect(() => {
    async function buscarComandas() {
      try {
        const resposta = await requisicaoApi("/api/garcom/comandas/", {
          cache: "no-store",
        });

        const lista = Array.isArray(resposta)
          ? resposta
          : resposta.results ?? [];

        const mesasFormatadas = lista.map((comanda) => ({
          id: comanda.id,
          numero: comanda.mesa,
          comanda: comanda.id,

          pedidos: (comanda.pedidos ?? []).map((pedido) => ({
            id: pedido.id,
            horario: pedido.data_pedido,

            itens: (pedido.itens ?? []).map((item, indice) => ({
              id: item.id ?? `${pedido.id}-${indice}`,
              nome: item.nome ?? item.item?.nome ?? "Item sem nome",
              quantidade: item.quantidade,
              status: item.status,
            })),
          })),
        }));

        setMesas(mesasFormatadas);
        setErro("");
      } catch (erro) {
        console.error("Erro ao buscar comandas:", erro);
        setErro(
          erro.message || "Não foi possível carregar suas comandas."
        );
      } finally {
        setCarregando(false);
      }
    }

    buscarComandas();
    const intervalo = setInterval(buscarComandas, 5000);

    return () => clearInterval(intervalo);
  }, [tentativa]);

  const obterEstiloStatus = (status) => {
    switch (status) {
      case "EM_PREPARO":
        return {
          texto: "Em preparo",
          cor: "bg-[#FCE4D8] text-[#E85D04]",
        };

      case "PRONTO":
        return {
          texto: "Pronto",
          cor: "bg-[#DDF3E4] text-[#24834A]",
        };

      case "ENTREGUE":
        return {
          texto: "Entregue",
          cor: "bg-[#E5E5E5] text-[#666666]",
        };

      default:
        return {
          texto: status || "Não informado",
          cor: "bg-gray-100 text-gray-600",
        };
    }
  };

  const formatarHorario = (data) => {
    if (!data) return "Horário não informado";

    return new Date(data).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Retorna o pedido mais recente da comanda.
  const obterUltimoPedido = (pedidos) => {
    if (!pedidos || pedidos.length === 0) return null;

    return [...pedidos].sort(
      (a, b) => new Date(b.horario) - new Date(a.horario)
    )[0];
  };

  const alternarDetalhes = (mesaId) => {
    setMesaExpandida((atual) =>
      atual === mesaId ? null : mesaId
    );
  };

  const quantidadeMesas = mesas.length;

  const quantidadePedidos = mesas.reduce(
    (total, mesa) => total + mesa.pedidos.length,
    0
  );

  if (carregando) {
    return (
      <main className="flex flex-col gap-8 text-header">
        <h1 className="font-header text-2xl font-bold">
          Painel de Atendimento
        </h1>
        <p>Carregando suas comandas...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8 text-header">
      <header>
        <h1 className="font-header text-2xl font-bold">
          Painel de Atendimento
        </h1>

        <p className="mt-2 font-extralight text-header">
          Acompanhe as mesas, comandas e pedidos sob sua responsabilidade.
        </p>
      </header>

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700"
        >
          {erro}
          <button
            onClick={() => setTentativa((atual) => atual + 1)}
            className="ml-2 font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Resumo do atendimento */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#D4AF43] bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Mesas atendidas
          </p>
          <p className="mt-2 text-3xl font-bold text-header">
            {quantidadeMesas}
          </p>
        </div>

        <div className="rounded-xl border border-[#D4AF43] bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Pedidos realizados
          </p>
          <p className="mt-2 text-3xl font-bold text-header">
            {quantidadePedidos}
          </p>
        </div>
      </section>

      {/* Listagem das mesas */}
      <section className="flex flex-col gap-5">
        <h2 className="font-header text-lg font-semibold">
          Minhas mesas
        </h2>

        {mesas.length === 0 ? (
          <div className="rounded-xl border border-[#D4AF43] bg-white p-5">
            <p className="font-semibold">
              Nenhuma mesa sob sua responsabilidade.
            </p>
            <p className="mt-2 text-sm font-extralight">
              As mesas aparecerão aqui quando forem atribuídas ao seu atendimento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {mesas.map((mesa) => {
              const ultimoPedido = obterUltimoPedido(mesa.pedidos);
              const expandida = mesaExpandida === mesa.id;

              return (
                <article
                  key={mesa.id}
                  className="flex flex-col gap-5 rounded-xl border border-[#D4AF43] bg-white p-5"
                >
                  {/* Cabeçalho da mesa */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-header text-lg font-bold">
                        Mesa {mesa.numero}
                      </h3>

                      <p className="mt-1 text-sm font-extralight">
                        Comanda #{mesa.comanda}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#DDF3E4] px-4 py-2 text-sm font-semibold text-[#24834A]">
                      Aberta
                    </span>
                  </div>

                  {/* Resumo: último pedido */}
                  {ultimoPedido ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-semibold">
                          Último pedido #{ultimoPedido.id}
                        </h4>

                        <span className="text-sm font-extralight text-gray-500">
                          {formatarHorario(ultimoPedido.horario)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {ultimoPedido.itens.map((item) => {
                          const estiloStatus = obterEstiloStatus(item.status);

                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4AF43]/20 pt-3"
                            >
                              <p className="min-w-0 flex-1 text-sm font-medium">
                                {item.quantidade}x {item.nome}
                              </p>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${estiloStatus.cor}`}
                              >
                                {estiloStatus.texto}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nenhum pedido realizado nesta comanda.
                    </p>
                  )}

                  {/* Botão para expandir ou recolher */}
                  <button
                    type="button"
                    onClick={() => alternarDetalhes(mesa.id)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#D4AF43] px-4 py-3 text-sm font-semibold text-header transition hover:bg-[#D4AF43]/10"
                  >
                    {expandida
                      ? "Ocultar detalhes"
                      : `Ver todos os pedidos (${mesa.pedidos.length})`}

                    <span>{expandida ? "▲" : "▼"}</span>
                  </button>

                  {/* Histórico completo da comanda */}
                  {expandida && (
                    <div className="flex flex-col gap-4 border-t border-[#D4AF43]/30 pt-4">
                      <h4 className="font-semibold">
                        Histórico de pedidos
                      </h4>

                      {[...mesa.pedidos]
                        .sort(
                          (a, b) =>
                            new Date(b.horario) - new Date(a.horario)
                        )
                        .map((pedido) => (
                          <div
                            key={pedido.id}
                            className="rounded-lg border border-[#D4AF43]/40 p-4"
                          >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                              <h5 className="font-semibold">
                                Pedido #{pedido.id}
                              </h5>

                              <span className="text-sm font-extralight text-gray-500">
                                {formatarHorario(pedido.horario)}
                              </span>
                            </div>

                            <div className="flex flex-col gap-3">
                              {pedido.itens.map((item) => {
                                const estiloStatus = obterEstiloStatus(
                                  item.status
                                );

                                return (
                                  <div
                                    key={item.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4AF43]/20 pt-3"
                                  >
                                    <p className="min-w-0 flex-1 text-sm font-medium">
                                      {item.quantidade}x {item.nome}
                                    </p>

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${estiloStatus.cor}`}
                                    >
                                      {estiloStatus.texto}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
