// Mensagens de retorno usadas nas telas do gerente.

// Aviso de sucesso que aparece no canto da tela.
export function AvisoSucesso({ mensagem }) {
  if (!mensagem) return null;

  return (
    <div role="status" className="fixed bottom-6 right-6 bg-header text-white px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-2 z-[70] border-l-4 border-hover">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-hover">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {mensagem}
    </div>
  );
}

// Faixa de erro no topo da página.
export function AvisoErro({ mensagem }) {
  if (!mensagem) return null;

  return (
    <div role="alert" className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
      <p className="font-bold">Aviso:</p>
      <p>{mensagem}</p>
    </div>
  );
}

// Erro mostrado dentro de um formulário ou de uma confirmação.
export function ErroFormulario({ mensagem }) {
  if (!mensagem) return null;

  return (
    <p role="alert" className="mb-4 rounded-md bg-red-100 border border-red-200 p-3 text-sm text-red-700 font-medium">
      {mensagem}
    </p>
  );
}
