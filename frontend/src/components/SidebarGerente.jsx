import { useState } from "react";
import logo from "../assets/logo.svg";

const linksPrincipais = [
  { nome: "Dashboard", href: "/gerente" },
  { nome: "Usuários", href: "/gerente/usuarios" },
  { nome: "Mesas", href: "/gerente/mesas" },
  { nome: "Categorias", href: "/gerente/categorias" },
  { nome: "Produtos", href: "/gerente/produtos" },
  { nome: "Promoções", href: "/gerente/promocoes" },
  { nome: "Comandas", href: "/gerente/comandas" },
];

const estiloLink =
  "flex min-h-12 w-full items-center rounded-lg px-4 py-3 text-left font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover";

function obterEstiloLink(ativo) {
  return `${estiloLink} ${
    ativo ? "bg-hover text-header" : "text-white hover:bg-white/10"
  }`;
}

function BotaoSair() {
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");

  async function sair() {
    setSaindo(true);
    setErro("");
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("csrftoken="))
        ?.slice("csrftoken=".length);
      const resposta = await fetch("/api/logout/", {
        method: "POST",
        headers: { "X-CSRFToken": csrfToken ?? "" },
      });
      if (!resposta.ok) throw new Error("Falha ao sair");

      window.location.replace("/configuracoes");
    } catch {
      setErro("Não foi possível sair. Tente novamente.");
      setSaindo(false);
    }
  }

  return (
    <div className="mt-6 shrink-0 border-t border-white/20 pt-4">
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        className={`${estiloLink} text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-50`}
      >
        {saindo ? "Saindo..." : "Sair"}
      </button>
      {erro && <p role="alert" className="mt-2 text-sm text-white">{erro}</p>}
    </div>
  );
}

export function SidebarGerente({ paginaAtual = "/gerente", onNavegar }) {
  function navegar(evento, destino) {
    if (!onNavegar) return;

    evento.preventDefault();
    onNavegar(destino);
  }

  return (
    <aside
      aria-label="Barra lateral do gerente"
      className="fixed inset-y-0 left-0 flex w-64 flex-col bg-header px-5 py-6 font-header text-white"
    >
      {/* Identificação */}
      <div className="mb-6 shrink-0">
        <a
          href="/gerente"
          onClick={(evento) => navegar(evento, "/gerente")}
          className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover"
        >
          <img
            src={logo}
            alt="BarStar"
            className="h-32 w-32 object-contain contrast-200"
          />
        </a>
      </div>

      <nav
        aria-label="Navegação do gerente"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="flex flex-col gap-2">
          {linksPrincipais.map((link) => {
            const ativo = paginaAtual === link.href;

            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(evento) => navegar(evento, link.href)}
                aria-current={ativo ? "page" : undefined}
                className={obterEstiloLink(ativo)}
              >
                {link.nome}
              </a>
            );
          })}
        </div>
      </nav>
      <BotaoSair />
    </aside>
  );
}
