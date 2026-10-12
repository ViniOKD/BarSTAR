export default function FiltroCategorias({
  categorias,
  categoriaAtual,
  onSelecionar,
}) {
  const opcoes = [
    { id: "", nome: "Todos" },
    ...categorias,
  ];

  return (
    <div
      role="group"
      aria-label="Filtrar por categoria"
      className="mb-6 flex gap-3 overflow-x-auto pb-2"
    >
      {opcoes.map((categoria) => {
        const selecionada = categoriaAtual === categoria.id;

        return (
          <button
            key={categoria.id}
            type="button"
            onClick={() => onSelecionar(categoria.id)}
            aria-pressed={selecionada}
            className={`min-h-11 shrink-0 rounded-full px-5 py-2
              font-header font-bold
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-hover ${
                selecionada
                  ? "bg-header text-white"
                  : "bg-hover text-header"
              }`}
          >
            {categoria.nome}
          </button>
        );
      })}
    </div>
  );
}
