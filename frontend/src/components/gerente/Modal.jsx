// Janela sobre a página, usada pelos formulários das telas do gerente.
export default function Modal({ titulo, subtitulo, largura = "max-w-md", onFechar, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`bg-destaque rounded-2xl w-full ${largura} max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8`}>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl transition-colors cursor-pointer z-10"
        >
          ×
        </button>

        <h2 className={`text-2xl font-bold text-header font-header ${subtitulo ? "mb-1" : "mb-6"}`}>
          {titulo}
        </h2>
        {subtitulo && <p className="text-sm text-header/70 mb-4">{subtitulo}</p>}

        {children}
      </div>
    </div>
  );
}
