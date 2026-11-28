import { useEffect, useState } from "react";

// Guarda uma mensagem que some sozinha depois de alguns segundos.
export function useMensagemTemporaria(duracao = 3000) {
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!mensagem) return;
    const temporizador = setTimeout(() => setMensagem(""), duracao);
    return () => clearTimeout(temporizador);
  }, [mensagem, duracao]);

  return [mensagem, setMensagem];
}
