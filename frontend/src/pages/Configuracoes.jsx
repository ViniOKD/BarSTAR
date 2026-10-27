import { useState } from "react";
import "./Configuracoes.css";

function IconeCampo({ senha = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {senha ? (
        <path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2h1Zm2 0h6V7a3 3 0 0 0-6 0v3Zm2 4v4h2v-4h-2Z" />
      ) : (
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2a9 9 0 0 0-9 8h18a9 9 0 0 0-9-8Z" />
      )}
    </svg>
  );
}

export default function Configuracoes() {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setMensagem("");
    setCarregando(true);
    try {
      const resposta = await fetch("/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, senha }),
      });
      if (!resposta.ok) {
        setErro(resposta.status >= 500
          ? "Servidor indisponível. Tente novamente mais tarde."
          : "Não foi possível entrar. Verifique seu CPF e senha.");
        setSenha("");
        return;
      }

      window.location.href = "/gerente";
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique a conexão.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="configuracoes-login">
      <section className="login-cartao" aria-labelledby="titulo-login">
        <header className="login-cabecalho">
          <h1 id="titulo-login">Login do gerente</h1>
        </header>
        <form className="login-formulario" onSubmit={aoEnviar} aria-busy={carregando}>
          <label className="sr-only" htmlFor="cpf">CPF</label>
          <div className="login-campo">
            <IconeCampo />
            <input id="cpf" name="cpf" type="text" inputMode="numeric"
              autoComplete="username" placeholder="CPF" required pattern="[0-9]{11}"
              title="Informe os 11 números do CPF" maxLength={11} value={cpf}
              onChange={(evento) => setCpf(evento.target.value.replace(/\D/g, ""))} />
          </div>
          <label className="sr-only" htmlFor="senha">Senha</label>
          <div className="login-campo">
            <IconeCampo senha />
            <input id="senha" name="senha" type={mostrarSenha ? "text" : "password"}
              autoComplete="current-password" placeholder="Senha" required value={senha}
              onChange={(evento) => setSenha(evento.target.value)} />
          </div>
          <div className="login-opcoes">
            <label className="login-mostrar-senha">
              <input type="checkbox" checked={mostrarSenha}
                onChange={(evento) => setMostrarSenha(evento.target.checked)} />
              Mostrar senha
            </label>
            <button type="button" className="login-ajuda" onClick={() => setMensagem(
              "Para redefinir sua senha, entre em contato com o administrador do sistema."
            )}>Esqueceu a senha?</button>
          </div>
          {erro && <p className="login-erro" role="alert">{erro}</p>}
          {mensagem && <p className="login-mensagem" role="status">{mensagem}</p>}
          <button type="submit" className="login-entrar" disabled={carregando}>
            {carregando ? "Acessando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
