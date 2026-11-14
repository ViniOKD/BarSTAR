import { ErroFormulario } from "./Avisos.jsx";

// Pergunta de confirmação antes de uma ação que não pode ser desfeita.
export default function ModalConfirmacao({
  titulo,
  children,
  erro = "",
  ocupado = false,
  textoConfirmar,
  textoCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-destaque p-8 rounded-xl w-full max-w-md shadow-2xl text-center border-t-4 border-red-500">
        <h3 className="text-2xl font-bold text-header mb-3 font-header">{titulo}</h3>
        <p className="text-header/80 mb-6">{children}</p>

        <ErroFormulario mensagem={erro} />

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={onCancelar}
            disabled={ocupado}
            className="bg-white text-header px-6 py-2.5 rounded-md font-bold hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={ocupado}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {ocupado ? "Aguarde..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
