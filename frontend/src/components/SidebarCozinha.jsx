import { useEffect, useState } from "react";
import logo from "../assets/logo.svg";
import { requisicaoApi } from "../utils/api";

const linksPrincipais = [
  { nome: "Painel de Preparo", href: "/cozinha" },
  { nome: "Disponibilidade", href: "/cozinha/disponibilidade" },
];

const estiloLink =
  "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover";

function obterEstiloLink(ativo) {
  return `${estiloLink} ${
    ativo
      ? "bg-hover text-header"
      : "text-white hover:bg-white/10"
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
    <div className="mt-2 shrink-0">
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        className={`${estiloLink} text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-50`}
      >
        {saindo ? "Saindo..." : "Sair"}
      </button>

      {erro && (
        <p role="alert" className="mt-2 text-sm text-white">
          {erro}
        </p>
      )}
    </div>
  );
}

export function SidebarCozinha({
  paginaAtual = "/cozinha",
  onNavegar,
}) {
  const [quantidadeEmPreparo, setQuantidadeEmPreparo] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function buscarQuantidade() {
      try {
        const resposta = await requisicaoApi("/api/pedidos/", {
          cache: "no-store",
        });

        const lista = Array.isArray(resposta)
          ? resposta
          : resposta.results ?? [];

        const quantidade = lista.reduce(
          (total, pedido) =>
            total +
            (pedido.itens_pedido ?? []).filter(
              (item) => item.status === "EM_PREPARO"
            ).length,
          0
        );

        if (ativo) {
          setQuantidadeEmPreparo(quantidade);
        }
      } catch (erro) {
        console.error("Erro ao buscar quantidade de itens:", erro);
      }
    }

    buscarQuantidade();

    const intervalo = setInterval(buscarQuantidade, 5000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  function navegar(evento, destino) {
    if (!onNavegar) return;
    evento.preventDefault();
    onNavegar(destino);
  }

  return (
    <aside
      aria-label="Barra lateral da cozinha"
      className="fixed inset-y-0 left-0 flex w-64 flex-col bg-header px-5 py-6 font-header text-white"
    >
      <div className="mb-6 shrink-0">
        <a
          href="/cozinha"
          onClick={(evento) => navegar(evento, "/cozinha")}
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
        aria-label="Navegação da cozinha"
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
                <span>{link.nome}</span>

                {link.href === "/cozinha" &&
                  quantidadeEmPreparo > 0 && (
                    <span
                      aria-label={`${quantidadeEmPreparo} itens aguardando preparo`}
                      className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white"
                    >
                      {quantidadeEmPreparo}
                    </span>
                  )}
              </a>
            );
          })}
        </div>
      </nav>

      <div className="mt-6 shrink-0 border-t border-white/20 pt-4" />

      <BotaoSair />
    </aside>
  );
}
