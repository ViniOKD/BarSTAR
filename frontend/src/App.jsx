import Header from "./components/Header";
import { FormAberturaComanda } from "./components/FormAberturaComanda";

export default function App() {
  // Pega o caminho atual da URL no navegador (ex: "/" ou "/abrir-comanda")
  const caminhoAtual = window.location.pathname;

  return (
    <>
      {/* Passa o caminho para o Header saber qual botão destacar */}
      <Header paginaAtual={caminhoAtual} />

      <main className="ml-64 p-8 bg-[#F5F5F5] min-h-screen flex items-center justify-center">
        {/* Se o usuário clicou em "Abrir Comanda", mostra o formulário */}
        {caminhoAtual === '/abrir-comanda' ? (
          <FormAberturaComanda />
        ) : (
          /* Caso contrário, mostra a tela inicial - alterar depois pra tela do Figma*/
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo ao BarStar</h1>
            <p className="text-gray-600">
              Clique em <strong>"Abrir Comanda"</strong> no menu ao lado para iniciar.
            </p>
          </div>
        )}
      </main>
    </>
  );
}