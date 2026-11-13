import { useState } from "react";
import { requisicaoApi } from "../../utils/api";
import "../Configuracoes.css";

export default function LoginGarcom() {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function aoEnviar(event) {
    event.preventDefault();
    setErro("");

    if (cpf.length !== 11 || !senha) {
      setErro("Informe um CPF válido e sua senha.");
      return;
    }

    setCarregando(true);

    try {
      await requisicaoApi("/api/login/garcom/", {
        method: "POST",
        body: JSON.stringify({ cpf, senha }),
      });

      window.location.href = "/garcom";
    } catch (erro) {
      setErro(erro.message || "Não foi possível realizar o login.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="configuracoes-login">
      <div className="login-cartao">
        <div className="login-cabecalho">
          <h1>Login do garçom</h1>
          <p>Entre com suas credenciais para acessar o painel.</p>
        </div>

        <form className="login-formulario" onSubmit={aoEnviar}>
          <div className="login-campo">
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              maxLength={11}
              placeholder="Digite seu CPF"
              value={cpf}
              onChange={(e) =>
                setCpf(e.target.value.replace(/\D/g, ""))
              }
              required
            />
          </div>

          <div className="login-campo">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />

            <div className="login-opcoes">
              <label className="login-mostrar-senha">
                <input
                  type="checkbox"
                  checked={mostrarSenha}
                  onChange={(e) => setMostrarSenha(e.target.checked)}
                />
                Mostrar senha
              </label>
            </div>
          </div>

          {erro && (
            <p className="login-erro" role="alert">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="login-entrar"
            disabled={carregando}
          >
            {carregando ? "Acessando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}