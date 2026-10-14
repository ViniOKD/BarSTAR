import { useState } from "react";
import formatarPreco from "../utils/formatarPreco";

export default function Comanda({ itens = [] }) {
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [fechamentoSolicitado, setFechamentoSolicitado] = useState(false);

  const total = itens.reduce(
    (soma, item) => soma + Number(item.preco) * Number(item.quantidade),
    0
  );

  return (
    <section className="text-header">
      <div className="mb-6">
        <h1 className="font-header text-2xl font-bold">
          Minha Comanda
        </h1>
        <p className="mt-2 text-sm text-header/70">
          Confira os itens registrados na sua comanda.
        </p>
      </div>

      <div className="space-y-3">
        {itens.length > 0 ? (
          itens.map((registro) => (
            <article
              key={registro.id}
              className="flex items-center gap-4 rounded-lg border border-hover bg-destaque p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-header font-bold">
                  {registro.item.nome}
                </h2>
                <p className="mt-1 text-sm text-header/70">
                  {formatarPreco(registro.preco)} por unidade
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-center gap-1">
                <p className="text-sm text-header/70">Status</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                    registro.status === "EM_PREPARO"
                      ? "bg-amber-100 text-amber-800"
                      : registro.status === "PRONTO"
                      ? "bg-green-100 text-green-800"
                      : registro.status === "ENTREGUE"
                      ? "bg-stone-200 text-stone-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  >
                    {registro.status === "EM_PREPARO"
                      ? "Em preparo"
                      : registro.status === "PRONTO"
                      ? "Pronto"
                      : registro.status === "ENTREGUE"
                      ? "Entregue"
                      : registro.status || "Aguardando"}
                </span>
              </div>

              <div className="shrink-0 text-center">
                <p className="text-sm text-header/70">Quantidade</p>
                <p className="font-bold">{registro.quantidade}</p>
              </div>

              <div className="w-24 shrink-0 text-right">
                <p className="text-sm text-header/70">Subtotal</p>
                <p className="font-bold text-[#996315]">
                  {formatarPreco(
                    Number(registro.preco) * Number(registro.quantidade)
                  )}
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-hover bg-destaque p-8 text-center">
            <p className="font-header font-bold">
              Nenhum item na comanda
            </p>
            <p className="mt-2 text-sm text-header/70">
              Os itens adicionados à sua comanda aparecerão aqui.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 border-t-2 border-hover pt-5">
        <div className="flex items-center justify-between gap-4">
          <span className="font-header text-lg font-bold">
            Total acumulado
          </span>
          <span className="text-2xl font-bold text-[#996315]">
            {formatarPreco(total)}
          </span>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setMostrarConfirmacao(true)}
            className="rounded-lg bg-header px-6 py-3 font-header font-bold text-destaque transition hover:opacity-90"
          >
            Fechar conta
          </button>
        </div>

        {mostrarConfirmacao && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacao"
            className="mt-4 rounded-lg border border-hover bg-destaque p-5"
          >
            <h2
              id="titulo-confirmacao"
              className="font-header text-lg font-bold"
            >
              Fechar conta
            </h2>

            <p className="mt-2 text-sm text-header/80">
              Deseja solicitar o fechamento da sua conta?
            </p>

            <p className="mt-3 font-bold text-[#996315]">
              Total: {formatarPreco(total)}
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMostrarConfirmacao(false)}
                className="rounded-lg border border-header px-4 py-2 font-header font-bold transition hover:bg-[#e8e2d4]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrarConfirmacao(false);
                  setFechamentoSolicitado(true);
                }}
                className="rounded-lg bg-header px-4 py-2 font-header font-bold text-destaque transition hover:opacity-90"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        {fechamentoSolicitado && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-hover bg-destaque p-5"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl text-[#996315]">✓</span>

              <div>
                <h2 className="font-header font-bold">
                  Solicitação registrada!
                </h2>

                <p className="mt-2 text-sm text-header/80">
                  Sua solicitação de fechamento foi enviada com sucesso.
                  Aguarde o atendimento do garçom para concluir o pagamento.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}