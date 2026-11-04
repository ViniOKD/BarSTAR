import { useEffect, useRef } from "react";
import formatarPreco from "../utils/formatarPreco";
import { deCentavos, paraCentavos } from "../utils/valores";

export default function Pedidos({ aberto, onFechar, itens = [], onRemoverItem, onEditarItem, onEnviar,
  enviando = false, atualizando = false, erro = "", aviso = "", onAtualizar }) {
  const dialogoRef = useRef(null);
  const ocupado = atualizando || enviando;
  const indisponivel = itens.some((item) => item.disponivel === false);
  const total = itens.reduce((soma, item) => soma + BigInt(paraCentavos(item.preco_atual)) * BigInt(item.quantidade), 0n);

  useEffect(() => {
    if (!aberto) return;
    const dialogo = dialogoRef.current;
    const overflowAnterior = document.body.style.overflow;
    dialogo.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialogo.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <dialog
      ref={dialogoRef}
      aria-labelledby="titulo-pedidos"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 backdrop:bg-black/30"
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar();
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onFechar();
        }
      }}
    >
      <section
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col
                   border-l border-hover bg-[#F4F0E5] p-6 text-header
                   shadow-2xl"
      >
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2
              id="titulo-pedidos"
              className="font-header text-2xl font-bold"
            >
              Meus pedidos
            </h2>

            <p className="mt-1 text-sm text-header/70">
              Confira os itens antes de enviar para preparo.
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar pedidos"
            className="flex size-10 shrink-0 items-center justify-center
                       rounded-lg text-header transition-colors
                       hover:bg-header/10 focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-hover"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-6"
            >
              <path
                d="M18 6 6 18M6 6l12 12"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {atualizando && <p role="status" className="mb-3 text-sm">Atualizando preços...</p>}
        {aviso && <p role="status" className="mb-3 text-sm">{aviso}</p>}
        {erro && <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>}
        {onAtualizar && (
          <button
            type="button"
            onClick={onAtualizar}
            disabled={ocupado}
            className="mb-3 min-h-11 rounded-lg border border-hover px-3 text-sm font-semibold hover:bg-header/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {erro ? "Tentar novamente" : "Atualizar preços"}
          </button>
        )}

        <div aria-busy={ocupado} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {itens.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center
                            rounded-xl border border-dashed border-hover/60
                            bg-white/50 p-6 text-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mb-4 size-14 text-header/50"
              >
                <path
                  d="M6 7h15l-2 10H8L6 3H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>

              <h3 className="font-header text-lg font-bold">
                Nenhum item adicionado
              </h3>

              <p className="mt-2 max-w-xs text-sm text-header/70">
                Os produtos escolhidos no cardápio aparecerão aqui.
              </p>
            </div>
          ) : (
            itens.map((item) => (
              <article
                key={item.idItemPedido}
                className="rounded-xl border border-hover/50 bg-white/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold">{item.nome}</h3>

                    <p className="mt-1 text-sm text-header/70">
                      {formatarPreco(item.preco_atual)} cada
                    </p>
                    {item.promocao_atual && paraCentavos(item.preco_atual) < paraCentavos(item.preco_unitario) && (
                      <>
                        <p className="text-sm text-header/70">
                          <span className="sr-only">Preço normal: </span><s>{formatarPreco(item.preco_unitario)}</s>
                        </p>
                        <p className="text-sm text-header/70">
                          {item.promocao_atual.desconto_percentual}% de desconto · {item.promocao_atual.nome}
                        </p>
                      </>
                    )}
                    {item.disponivel === false && <p className="mt-1 text-sm font-semibold text-red-700">Produto indisponível</p>}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-bold text-[#996315]">
                      {formatarPreco(
                        deCentavos(BigInt(paraCentavos(item.preco_atual)) * BigInt(item.quantidade))
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => onEditarItem(item)}
                        disabled={ocupado || item.disponivel === false}
                        aria-label={`Editar ${item.nome}`}
                        title="Editar item"
                        className="rounded-md p-2 text-green-600 transition-colors
                                  hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-5"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </svg>
                      </button>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => onRemoverItem(item.idItemPedido)}
                        disabled={ocupado}
                        aria-label={`Remover ${item.nome}`}
                        title="Remover item"
                        className="rounded-md p-2 text-red-600 transition-colors
                                  hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-5"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="m19 6-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-sm">
                  Quantidade: {item.quantidade}
                </p>

                {item.observacoes && (
                  <p className="mt-1 break-words text-sm text-header/70">
                    Observações: {item.observacoes}
                  </p>
                )}
              </article>
            ))
          )}
        </div>

        <footer className="mt-5 border-t border-hover/40 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-medium">Total parcial</span>
            <span className="text-xl font-bold text-[#996315]">
              {formatarPreco(deCentavos(total))}
            </span>
          </div>

          <button
            type="button"
            onClick={onEnviar}
            disabled={itens.length === 0 || ocupado || Boolean(erro) || indisponivel}
            className="min-h-12 w-full rounded-lg bg-[#996315] px-4 py-3
                      font-bold text-white transition-colors
                      hover:bg-[#80520f] disabled:cursor-not-allowed
                      disabled:bg-[#996315]/50"
          >
            {enviando ? "Enviando..." : "Enviar para preparo"}
          </button>
        </footer>
      </section>
    </dialog>
  );
}
