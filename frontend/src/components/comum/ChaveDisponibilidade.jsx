// Chave seletora que alterna o produto entre Disponível e Indisponível.
export default function ChaveDisponibilidade({ disponivel, desabilitado = false, onAlternar }) {
  const texto = disponivel ? "Disponível" : "Indisponível";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={disponivel}
      aria-label={texto}
      disabled={desabilitado}
      onClick={() => onAlternar(!disponivel)}
      className="inline-flex items-center gap-3 cursor-pointer disabled:cursor-wait disabled:opacity-60"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          disponivel ? "bg-emerald-600" : "bg-red-500"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            disponivel ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className={`w-24 text-left font-bold ${disponivel ? "text-emerald-600" : "text-red-500"}`}>
        {texto}
      </span>
    </button>
  );
}
