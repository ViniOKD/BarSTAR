function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CardProduto({ produto, onClick }) {
  const {
    nome, descricao, imagem, detalhe, volume_ml, preco_unitario,
  } = produto;
  const detalheProduto = detalhe || (volume_ml != null ? `${volume_ml} ml` : "");

  return (
    <button
      type="button"
      onClick={() => onClick?.(produto)}
      aria-label={`Ver detalhes de ${nome}`}
      className="flex h-52 w-full cursor-pointer items-stretch overflow-hidden rounded-lg border border-hover bg-destaque text-left text-header shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hover active:scale-[0.99]"
    >
      <img
        src={imagem || "/media/itens/default.jpg"}
        alt=""
        loading="lazy"
        className="h-full w-[42%] shrink-0 object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <h2 className="line-clamp-2 shrink-0 font-header text-base font-bold leading-5 text-header">
          {nome}
        </h2>

        {descricao && (
          <p className="line-clamp-2 shrink-0 text-sm leading-5 text-header/80">
            {descricao}
          </p>
        )}

        {detalheProduto && (
          <span className="shrink-0 truncate text-sm text-header/70">{detalheProduto}</span>
        )}

        <span className="mt-auto shrink-0 text-xl font-bold text-[#996315]">
          {formatarPreco(preco_unitario)}
        </span>
      </div>
    </button>
  );
}

