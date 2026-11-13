import { useEffect, useState } from "react";
import { requisicaoApi } from "../utils/api.js";

// Só mostra as telas do gerente depois de confirmar o login no servidor.
// Sem login, leva direto para a tela de login.
export default function RotaGerente({ children }) {
  const [logado, setLogado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    requisicaoApi("/api/sessao/")
      .then(() => setLogado(true))
      .catch((falha) => {
        if (falha.status === 401) {
          window.location.replace("/configuracoes");
        } else {
          setErro("Não foi possível verificar o login. Recarregue a página.");
        }
      });
  }, []);

  if (erro) {
    return <p role="alert" className="p-8 font-bold text-header">{erro}</p>;
  }

  if (!logado) {
    return <p role="status" className="p-8 font-bold text-header">Verificando login...</p>;
  }

  return children;
}
