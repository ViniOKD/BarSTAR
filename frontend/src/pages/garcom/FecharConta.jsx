import { useEffect, useState } from "react";
import formatarPreco from "../../utils/formatarPreco";
import { deCentavos, paraCentavos } from "../../utils/valores";

const formasPagamento = [
  { id: "DINHEIRO", nome: "Dinheiro"},
  { id: "PIX", nome: "Pix"},
  { id: "CREDITO", nome: "Crédito"},
  { id: "DEBITO", nome: "Débito"},
];

export default function FecharConta({ solicitacao, onVoltar }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [fechamentoConfirmado, setFechamentoConfirmado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState("");

  // busca os dados da comanda da solicitação selecionada.
  useEffect(() => {
    async function buscarComanda() {
      try {
        setCarregando(true);
        setErro("");

        if (!solicitacao?.mesa) {
          throw new Error("Não foi possível identificar a mesa.");
        }

        const resposta = await fetch(`/api/mesas/${solicitacao.mesa}/comanda/`);
        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.erro || "Não foi possível consultar a comanda."
          );
        }

        // Organiza os itens de todos os pedidos da comanda.
        const itensComanda = (dados.pedidos ?? []).flatMap((pedido) =>
          (pedido.itens ?? []).map((item) => ({
            id: item.id,
            nome: item.nome,
            preco: item.preco_unitario,
            quantidade: item.quantidade,
            status: item.status,
          }))
        );

        setItens(itensComanda);

      } catch (erro) {
        console.error("Erro ao buscar comanda:", erro);
        setErro(erro.message || "Não foi possível carregar a comanda.");
      } finally {
        setCarregando(false);
      }
    }

    buscarComanda();
  }, [solicitacao]);

  // Calcula o valor total utilizando centavos.
  const total = itens.reduce(
    (soma, item) =>
      soma +
      BigInt(paraCentavos(item.preco)) * BigInt(item.quantidade),
    0n
  );

  // Converte o valor recebido para centavos.
  const recebidoEmCentavos = valorRecebido.trim()
    ? BigInt(paraCentavos(valorRecebido))
    : 0n;

  // Calcula o troco.
  const troco =
    recebidoEmCentavos > total
      ? recebidoEmCentavos - total
      : 0n;

  // Verifica se o pagamento pode ser confirmado.
  const pagamentoValido =
    formaPagamento !== "" &&
    (
      formaPagamento !== "DINHEIRO" ||
      recebidoEmCentavos >= total
    );

  // Confirmação visual do fechamento (somente front-end).
  async function confirmarFechamento() {
    if (!pagamentoValido || itens.length === 0) return;

    try{
      setSalvando(true);
      setErroPagamento("");

    // Converte o total de centavos para uma string decimal.
    const valorPagamento = `${total / 100n}.${String(total % 100n).padStart(2, "0")}`;

        // Envia a confirmação do pagamento para o Django.
    const resposta = await fetch(
      `/api/mesas/${solicitacao.mesa}/comanda/confirmar-pagamento/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valor: valorPagamento,
          forma_pagamento: formaPagamento,
        }),
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Não foi possível registrar o pagamento."
      );
    }

    // Pagamento registrado 
    setFechamentoConfirmado(true);

  } catch (erro) {
    console.error("Erro ao confirmar pagamento:", erro);
    setErroPagamento(erro.message);
  } finally {
    setSalvando(false);
    }
  }

  return (
    <main className="flex flex-col gap-8 text-header">

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-header text-2xl font-bold">
            Fechamento de Comanda
          </h1>

          <p className="mt-2 text-sm text-header/70">
            Confira os itens consumidos e registre o pagamento.
          </p>
        </div>

        <button
          type="button"
          onClick={onVoltar}
          className="rounded-full border border-[#D4AF43] px-5 py-2
          font-header font-semibold transition hover:bg-[#F5EBD0]"
        >
          Voltar às solicitações
        </button>
      </header>

      {/* Identificação da comanda */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div className="rounded-xl border border-[#D4AF43] bg-white p-5">
          <p className="text-sm text-header/70">
            Mesa
          </p>

          <h2 className="mt-1 font-header text-xl font-bold">
            {solicitacao?.mesa ?? "Não identificada"}
          </h2>
        </div>

        <div className="rounded-xl border border-[#D4AF43] bg-white p-5">
          <p className="text-sm text-header/70">
            Comanda
          </p>

          <h2 className="mt-1 font-header text-xl font-bold">
            {solicitacao?.comanda ?? "Não identificada"}
          </h2>
        </div>

      </section>

      {/* Resumo dos itens consumidos */}
      <section className="rounded-xl border border-[#D4AF43] bg-white p-6">

        <h2 className="mb-5 font-header text-xl font-bold">
          Resumo do consumo
        </h2>

        {carregando && (
          <p className="py-8 text-center text-sm text-gray-500">
            Carregando itens da comanda...
          </p>
        )}

        {erro && (
          <p role="alert" className="py-6 text-center text-sm text-red-600">
            {erro}
          </p>
        )}

        {!carregando && !erro && itens.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            Nenhum item encontrado nesta comanda.
          </p>
        )}

        {!carregando && !erro && itens.length > 0 && (
          <div className="flex flex-col gap-3">

            {/* Cabeçalho da tabela */}
            <div className="hidden grid-cols-4 gap-4 border-b
            border-[#E5D8B5] pb-3 text-sm font-semibold text-header/70 sm:grid">
              <span>Produto</span>
              <span className="text-center">Quantidade</span>
              <span className="text-right">Valor unitário</span>
              <span className="text-right">Subtotal</span>
            </div>

            {/* Produtos */}
            {itens.map((item) => {
              const subtotal =
                BigInt(paraCentavos(item.preco)) *
                BigInt(item.quantidade);

              return (
                <article
                  key={item.id}
                  className="grid grid-cols-2 gap-3 border-b
                  border-[#F0E9D9] py-3 sm:grid-cols-4 sm:items-center"
                >
                  <div>
                    <p className="font-semibold">
                      {item.nome}
                    </p>

                    <p className="text-xs text-header/60 sm:hidden">
                      {formatarPreco(item.preco)} por unidade
                    </p>
                  </div>

                  <div className="text-right sm:text-center">
                    <span className="text-xs text-header/60 sm:hidden">
                      Quantidade:{" "}
                    </span>

                    <span className="font-medium">
                      {item.quantidade}
                    </span>
                  </div>

                  <div className="hidden text-right sm:block">
                    {formatarPreco(item.preco)}
                  </div>

                  <div className="text-right font-bold text-[#996315]">
                    <span className="text-xs text-header/60 sm:hidden">
                      Subtotal:{" "}
                    </span>

                    {formatarPreco(deCentavos(subtotal))}
                  </div>
                </article>
              );
            })}

          </div>
        )}

        {/* Total */}
        <div className="mt-6 flex items-center justify-between gap-4
        border-t-2 border-[#D4AF43] pt-5">

          <span className="font-header text-lg font-bold">
            Valor total
          </span>

          <span className="text-2xl font-bold text-[#996315]">
            {formatarPreco(deCentavos(total))}
          </span>

        </div>

      </section>

      {/* Forma de pagamento */}
      <section className="rounded-xl border border-[#D4AF43] bg-white p-6">
        <h2 className="font-header text-xl font-bold">
          Forma de pagamento
        </h2>

        <p className="mb-5 mt-2 text-sm text-header/70">
          Selecione a forma de pagamento utilizada pelo cliente.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {formasPagamento.map((forma) => (
            <button
              key={forma.id}
              type="button"
              onClick={() => {
                setFormaPagamento(forma.id);
                setFechamentoConfirmado(false);
              }}
              className={`flex flex-col items-center gap-2 rounded-xl
              border p-4 transition ${
                formaPagamento === forma.id
                  ? "border-[#D4AF43] bg-[#F5EBD0] ring-2 ring-[#D4AF43]"
                  : "border-gray-200 hover:border-[#D4AF43]"
              }`}
            >
              <span className="font-semibold">
                {forma.nome}
              </span>
            </button>
          ))}
        </div>

        {/* Campo de dinheiro */}
        {formaPagamento === "DINHEIRO" && (
          <div className="mt-6 max-w-sm">
            <label
              htmlFor="valorRecebido"
              className="mb-2 block text-sm font-semibold"
            >
              Valor recebido pelo cliente
            </label>

            <input
              id="valorRecebido"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 100,00"
              value={valorRecebido}
              onChange={(e) => {
                setValorRecebido(e.target.value);
                setFechamentoConfirmado(false);
              }}
              className="w-full rounded-lg border border-[#D4AF43]
              bg-white px-4 py-3 outline-none focus:ring-2
              focus:ring-[#D4AF43]"
            />

            {/* Troco */}
            <div className="mt-4 rounded-lg bg-[#F5EBD0] p-4">

              <p className="text-sm text-header/70">
                Troco
              </p>

              <p className="mt-1 text-xl font-bold text-[#996315]">
                {formatarPreco(deCentavos(troco))}
              </p>

              {valorRecebido !== "" && recebidoEmCentavos < total && (
                <p className="mt-2 text-sm text-red-600">
                  O valor recebido é menor que o total da conta.
                </p>
              )}
            </div>
          </div>
        )}

      </section>

      {/* Ações */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onVoltar}
          className="rounded-full border border-[#D4AF43] px-6 py-3
          font-header font-semibold transition hover:bg-[#F5EBD0]"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={confirmarFechamento}
          disabled={
            carregando ||
            salvando ||
            !!erro ||
            itens.length === 0 ||
            !pagamentoValido ||
            fechamentoConfirmado
          }
          className="rounded-full bg-[#D4AF43] px-8 py-3
          font-header font-bold text-white transition
          hover:opacity-90 disabled:cursor-not-allowed
          disabled:opacity-50"
        >
          {salvando ? "Registrando pagamento..." : "Confirmar pagamento"}
        </button>

      </section>

      {/* Mensagem de confirmação */}
      {fechamentoConfirmado && (
        <div
          role="status"
          className="rounded-xl border border-green-300 bg-green-50 p-5"
        >
          <h2 className="font-header font-bold text-green-800">
            Pagamento registrado com sucesso!
          </h2>

          <p className="mt-2 text-sm text-green-700">
            A comanda foi finalizada e a mesa está disponível novamente.
          </p>

          <button
            type="button"
            onClick={onVoltar}
            className="mt-4 rounded-full bg-green-700 px-5 py-2
            font-semibold text-white transition hover:opacity-90"
          >
            Voltar às solicitações
          </button>
        </div>
      )}
    </main>
  );
}