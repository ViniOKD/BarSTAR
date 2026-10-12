import { useEffect, useId, useRef, useState } from "react";
import formatarPreco from "../utils/formatarPreco";

const estiloFoco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover";
const estiloCampo = `rounded-lg border border-hover bg-fundo ${estiloFoco}`;
const estiloBotao = `min-h-12 cursor-pointer rounded-lg px-4 ${estiloFoco}`;
const estiloPreco = "text-xl font-bold text-[#996315]";

export default function ModalProduto({ produto, onFechar }) {
  const modalRef = useRef(null);
  const modalId = useId();
  const tituloId = `${modalId}-titulo`;
  const quantidadeId = `${modalId}-quantidade`;
  const observacoesId = `${modalId}-observacoes`;
  const [quantidade, setQuantidade] = useState(1);
  const preco = Number(produto.preco_unitario);
  const quantidadeNumerica = Number(quantidade);
  const quantidadeValida = Number.isInteger(quantidadeNumerica) && quantidadeNumerica >= 1;
  const subtotal = preco * (quantidadeValida ? quantidadeNumerica : 0);
  const detalhe = produto.detalhe || (produto.volume_ml != null ? `${produto.volume_ml} ml` : "");

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
      aria-labelledby={tituloId}
      className="m-auto max-h-[90dvh] w-[min(720px,calc(100%-32px))] overflow-y-auto rounded-lg border border-hover bg-destaque p-0 text-header shadow-xl backdrop:bg-black/60"
    >
      <div className="grid md:grid-cols-[240px_1fr]">
        <div className="flex items-center bg-fundo p-4 border-hover md:border-r">
          <img
            src={produto.imagem || "/media/itens/default.jpg"}
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

          <p className={estiloPreco}>{formatarPreco(preco)}</p>

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
              step="1"
              required
              value={quantidade}
              onChange={(evento) => setQuantidade(evento.target.value)}
              className={`${estiloCampo} min-h-12 w-24 px-3`}
            />
          </div>

          <div>
            <label htmlFor={observacoesId} className="mb-1 block text-sm font-semibold">Observações opcionais</label>
            <textarea
              id={observacoesId}
              rows="2"
              placeholder="Ex.: sem cebola"
              className={`${estiloCampo} w-full resize-none p-2`}
            />
          </div>

          <div className="flex items-center justify-between border-t border-hover pt-2">
            <span>Subtotal</span>
            <span className={estiloPreco}>{formatarPreco(subtotal)}</span>
          </div>
          <button type="button" className={`${estiloBotao} bg-hover py-3 font-bold hover:brightness-95`}>
            Adicionar à comanda
          </button>
        </div>
      </div>
    </dialog>
  );
}
