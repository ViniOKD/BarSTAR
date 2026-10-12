import Header from "./components/Header";
import { FormAberturaComanda } from "./components/FormAberturaComanda";

export default function App() {
  const caminhoAtual = window.location.pathname;
  
  // Define se é a tela de início (sem menu lateral)
  const isTelaInicial = caminhoAtual === '/abrir-comanda' || caminhoAtual === '/';

  return (
    <div className="flex w-full min-h-screen bg-[#F5F5F5]">
      {/* Renderiza o Header apenas se NÃO for a tela inicial */}
      {!isTelaInicial && <Header paginaAtual={caminhoAtual} />}

      {/* Ajusta a largura e margem dinamicamente */}
      <main className={`flex-1 flex items-center justify-center ${isTelaInicial ? 'w-full bg-gray-900' : 'ml-64 p-8'}`}>
        
        {isTelaInicial ? (
          <FormAberturaComanda />
        ) : (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Cardápio</h1>
            <p className="text-gray-600">
              O cliente já está com a comanda aberta. Exiba o cardápio aqui.
            </p>
          </div>
        )}
        
      </main>
    </div>
  );
}