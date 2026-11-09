import { useEffect, useId, useRef, useState } from "react";
import formatarPreco from "../utils/formatarPreco";
import { deCentavos, paraCentavos } from "../utils/valores";

const estiloFoco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover";
const estiloCampo = `rounded-lg border border-hover bg-fundo ${estiloFoco}`;
const estiloBotao = `min-h-12 cursor-pointer rounded-lg px-4 ${estiloFoco}`;
const estiloPreco = "text-xl font-bold text-[#996315]";

export default function ModalProduto({ produto, onFechar, onAdicionar,  itemEmEdicao = null }) {
  const modalRef = useRef(null);
  const modalId = useId();
  const tituloId = `${modalId}-titulo`;
  const quantidadeId = `${modalId}-quantidade`;
  const observacoesId = `${modalId}-observacoes`;
  const [quantidade, setQuantidade] = useState(itemEmEdicao?.quantidade ?? 1);
  const [observacoes, setObservacoes] = useState(itemEmEdicao?.observacoes ?? "");
  const preco = itemEmEdicao?.preco_atual ?? produto.preco_atual;
  const quantidadeNumerica = Number(quantidade);
  const quantidadeValida = Number.isInteger(quantidadeNumerica) && quantidadeNumerica >= 1
    && quantidadeNumerica <= 2147483647;
  const subtotal = BigInt(paraCentavos(preco)) * BigInt(quantidadeValida ? quantidadeNumerica : 0);
  const detalhe = produto.detalhe || (produto.volume_ml != null ? `${produto.volume_ml} ml` : "");
  const emPromocao = produto.promocao_atual && paraCentavos(preco) < paraCentavos(produto.preco_unitario);

  useEffect(() => {
    const modal = modalRef.current;
    const overflowAnterior = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      modal.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <dialog
      ref={modalRef}
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar();
      }}
      onMouseDown={(evento) => {
        if (evento.target !== evento.currentTarget) return;
        const limites = evento.currentTarget.getBoundingClientRect();
        if (evento.clientX < limites.left || evento.clientX > limites.right
          || evento.clientY < limites.top || evento.clientY > limites.bottom) {
          onFechar();
        }
      }}
      aria-labelledby={tituloId}
      className="m-auto max-h-[90dvh] w-[min(720px,calc(100%-32px))] overflow-y-auto rounded-lg border border-hover bg-destaque p-0 text-header shadow-xl backdrop:bg-black/60"
    >
      <div className="grid md:grid-cols-[240px_1fr]">
        <div className="flex items-center bg-fundo p-4 border-hover md:border-r">
          <img
            src={produto.imagem || "/media/itens/default.png"}
            alt={produto.nome}
            className="h-32 w-full rounded-lg object-cover md:h-56"
          />
        </div>

        <div className="flex flex-col gap-2 p-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onFechar}
              className={`${estiloBotao} hover:bg-header/10`}
            >
              Fechar
            </button>
          </div>

          <div>
            <h2 id={tituloId} className="font-header text-2xl font-bold">{produto.nome}</h2>
            {produto.descricao && <p className="mt-2 text-sm leading-relaxed text-header/80">{produto.descricao}</p>}
            {detalhe && <p className="mt-2 text-sm text-header/70">{detalhe}</p>}
          </div>

          <div>
            {emPromocao && (
              <>
                <p className="text-sm text-header/70">
                  <span className="sr-only">Preço normal: </span><s>{formatarPreco(produto.preco_unitario)}</s>
                </p>
                <p className="text-sm font-semibold">
                  {produto.promocao_atual.desconto_percentual}% de desconto · {produto.promocao_atual.nome}
                </p>
              </>
            )}
            <p className={estiloPreco}>{formatarPreco(preco)}</p>
          </div>

          {Number(produto.teor_alcoolico) > 0 && (
            <p className="rounded-lg bg-hover/25 p-2 text-sm">
              A compra de bebidas alcoólicas é proibida para menores de 18 anos.
            </p>
          )}

          <div>
            <label htmlFor={quantidadeId} className="mb-1 block text-sm font-semibold">Quantidade</label>
            <input
              id={quantidadeId}
              type="number"
              min="1"
              max="2147483647"
              step="1"
              required
              value={quantidade}
              aria-invalid={!quantidadeValida}
              aria-describedby={!quantidadeValida ? `${quantidadeId}-erro` : undefined}
              onChange={(evento) => setQuantidade(evento.target.value)}
              className={`${estiloCampo} min-h-12 w-24 px-3`}
            />
            {!quantidadeValida && (
              <p id={`${quantidadeId}-erro`} role="alert" className="mt-1 text-sm text-red-700">
                Informe uma quantidade inteira válida para este produto.
              </p>
            )}
          </div>

          <div>
            <label htmlFor={observacoesId} className="mb-1 block text-sm font-semibold">Observações opcionais</label>
            <textarea
              id={observacoesId}
              rows="2"
              placeholder="Ex.: sem cebola"
              value={observacoes}
              onChange={(evento) => setObservacoes(evento.target.value)}
              className={`${estiloCampo} w-full resize-none p-2`}
            />
          </div>

          <div className="flex items-center justify-between border-t border-hover pt-2">
            <span>Subtotal</span>
            <span className={estiloPreco}>{formatarPreco(deCentavos(subtotal))}</span>
          </div>
          <button
            type="button"
            disabled={!quantidadeValida}
            onClick={() => {
              onAdicionar({
                ...produto,
                ...itemEmEdicao,
                preco_atual: preco,
                quantidade: quantidadeNumerica,
                observacoes: observacoes.trim(),
              });

              onFechar();
            }}
            className={`${estiloBotao} bg-hover py-3 font-bold hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {itemEmEdicao ? "Atualizar item" : "Adicionar à comanda"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
