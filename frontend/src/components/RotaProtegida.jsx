import { useEffect, useState } from "react";
import { requisicaoApi } from "../utils/api.js";

// Só mostra a tela depois de confirmar no servidor que há alguém logado
// com um dos cargos permitidos. Caso contrário, leva para a tela de login.
export default function RotaProtegida({ cargos, children }) {
  const [liberado, setLiberado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    requisicaoApi("/api/sessao/")
      .then((dados) => {
        if (cargos.includes(dados.usuario.cargo)) {
          setLiberado(true);
        } else {
          window.location.replace("/configuracoes");
        }
      })
      .catch((falha) => {
        if (falha.status === 401) {
          window.location.replace("/configuracoes");
        } else {
          setErro("Não foi possível verificar o login. Recarregue a página.");
        }
      });
    // A lista de cargos é fixa em cada rota, então a verificação roda uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (erro) {
    return <p role="alert" className="p-8 font-bold text-header">{erro}</p>;
  }

  if (!liberado) {
    return <p role="status" className="p-8 font-bold text-header">Verificando login...</p>;
  }

  return children;
}
