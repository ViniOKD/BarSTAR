import { useState } from "react";
import { requisicaoApi } from "../utils/api.js";

// Tela provisória da cozinha e do bar. O Painel de Preparo será feito em outra tarefa.
export default function Preparo() {
  const [erro, setErro] = useState("");

  async function sair() {
    setErro("");
    try {
      await requisicaoApi("/api/logout/", { method: "POST" });
      window.location.replace("/configuracoes");
    } catch {
      setErro("Não foi possível sair. Tente novamente.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fundo p-8 text-center text-header">
      <h1 className="font-header text-3xl font-bold">Painel de Preparo</h1>
      <p>O login funcionou, mas esta tela ainda não está disponível.</p>
      <button type="button" onClick={sair} className="rounded-md bg-header px-4 py-2 font-bold text-white">
        Sair
      </button>
      {erro && <p role="alert" className="text-red-700">{erro}</p>}
    </main>
  );
}
