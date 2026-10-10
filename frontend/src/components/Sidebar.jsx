import { useState } from "react";
import logo from "../assets/logo.svg";

const linksPrincipais = [
  { nome: "Início", href: "/" },
  { nome: "Cardápio", href: "/cardapio" },
  { nome: "Promoções", href: "/promocoes" },
];

// TODO: carregar as categorias pela API.
const categorias = [
  { nome: "Bebidas", id: "bebidas" },
  { nome: "Comidas", id: "comidas" },
  { nome: "Para acompanhar", id: "acompanhamentos" },
];

const estiloLink =
  "flex min-h-12 w-full items-center rounded-lg px-4 py-3 text-left font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover";

const estiloCategoria =
  "min-h-12 w-full rounded-lg px-3 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover";

function obterEstiloLink(ativo) {
  return `${estiloLink} ${
    ativo
      ? "bg-hover text-header"
      : "text-white hover:bg-white/10"
  }`;
}

function obterEstiloCategoria(selecionada) {
  return `${estiloCategoria} ${
    selecionada
      ? "bg-hover font-bold text-header"
      : "text-white/80 hover:bg-white/10"
  }`;
}

export default function Sidebar({
  paginaAtual = "/",
  onNavegar,
  onSelecionarCategoria,
  onChamarGarcom,
}) {
  const [categoriaAtual, setCategoriaAtual] = useState("");

  const estaNoCardapio = paginaAtual === "/cardapio";

  function navegar(evento, destino) {
    if (!onNavegar) return;

    evento.preventDefault();
    onNavegar(destino);
  }

  function selecionarCategoria(categoriaId) {
    setCategoriaAtual(categoriaId);
    onSelecionarCategoria?.(categoriaId);
  }

  return (
    <aside
      aria-label="Barra lateral"
      className="fixed inset-y-0 left-0 flex w-64 flex-col bg-header px-5 py-6 font-header text-white"
    >
      {/* Identificação */}
      <div className="mb-6 shrink-0">
        <a
          href="/"
          onClick={(evento) => navegar(evento, "/")}
          className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hover"
        >
          <img
            src={logo}
            alt="BarStar"
            className="h-32 w-32 object-contain contrast-200"
          />
        </a>
      </div>

      {/* Navegação principal */}
      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="flex flex-col gap-2">
          {linksPrincipais.map((link) => {
            const ativo = paginaAtual === link.href;
            const mostrarCategorias =
              link.href === "/cardapio" && estaNoCardapio;

            return (
              <div key={link.href}>
                <a
                  href={link.href}
                  onClick={(evento) => navegar(evento, link.href)}
                  aria-current={ativo ? "page" : undefined}
                  className={obterEstiloLink(ativo)}
                >
                  {link.nome}
                </a>

                {mostrarCategorias && (
                  <div
                    role="group"
                    aria-label="Categorias do cardápio"
                    className="my-2 ml-4 flex flex-col gap-1 border-l border-white/20 pl-3"
                  >
                    {categorias.map((categoria) => {
                      const selecionada =
                        categoriaAtual === categoria.id;

                      return (
                        <button
                          key={categoria.id}
                          type="button"
                          onClick={() =>
                            selecionarCategoria(categoria.id)
                          }
                          aria-pressed={selecionada}
                          className={obterEstiloCategoria(selecionada)}
                        >
                          {categoria.nome}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Comanda e atendimento */}
      <div className="mt-6 shrink-0 border-t border-white/20 pt-4">
        <a
          href="/comanda"
          onClick={(evento) => navegar(evento, "/comanda")}
          aria-current={
            paginaAtual === "/comanda" ? "page" : undefined
          }
          className={obterEstiloLink(paginaAtual === "/comanda")}
        >
          Comanda
        </a>

        <button
          type="button"
          onClick={onChamarGarcom}
          className={`${estiloLink} mt-3 border border-hover text-hover hover:bg-white/10`}
        >
          Chamar garçom
        </button>
      </div>
    </aside>
  );
}