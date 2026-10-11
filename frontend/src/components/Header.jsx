import logo from "../assets/logo.svg";

const links = [
  { nome: "Home", href: "/" },
  { nome: "Cardápio", href: "/cardapio" },
  { nome: "Promoções", href: "/promocoes" },
  { nome: "Abrir Comanda", href: "/abrir-comanda" },
  { nome: "Carrinho", href: "/carrinho" },
];

export default function Header({ paginaAtual = "/" }) {
  return (
    <header className="fixed inset-y-0 left-0 flex w-64 flex-col gap-8 overflow-y-auto bg-header px-5 py-6 text-white">
      <a
        href="/"
        className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-barstar-destaque"
      >
        <img
          src={logo}
          alt=""
          className="h-32 w-32 contrast-200"
        />
      </a>

      <nav
        aria-label="Navegação principal"
        className="flex w-full flex-col gap-2"
      >
        {links.map((link) => {
          const ativo = paginaAtual === link.href;

          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-12 items-center justify-start rounded-lg px-3 py-3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-barstar-destaque lg:px-4 lg:text-lg ${
                ativo
                  ? "bg-barstar-destaque text-barstar-texto"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {link.nome}
            </a>
          );
        })}
      </nav>
    </header>
  );
}