export async function requisicaoApi(url, opcoes = {}) {
  const headers = new Headers(opcoes.headers);
  const metodo = (opcoes.method || "GET").toUpperCase();
  if (typeof opcoes.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(metodo)) {
    // escritas autenticadas pela sessão do Django também precisam do token CSRF
    const token = (typeof document === "undefined" ? "" : document.cookie)
      .split(";")
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith("csrftoken="))
      ?.slice("csrftoken=".length);
    if (token) headers.set("X-CSRFToken", decodeURIComponent(token));
  }
  const resposta = await fetch(url, { credentials: "same-origin", ...opcoes, headers });
  // DELETE e logout podem responder sem corpo -> não há JSON para ler nesses casos
  if (resposta.status === 204) return null;
  const json = resposta.headers.get("content-type")?.includes("json");
  const dados = json ? await resposta.json() : null;
  if (!resposta.ok) {
    let mensagem = dados?.erro || dados?.detail || "Não foi possível concluir a operação.";
    if (resposta.status === 401) mensagem = "Sua sessão expirou. Entre novamente.";
    if (resposta.status === 403) mensagem = "Acesso negado. Verifique sua sessão e permissões.";
    const erro = new Error(typeof mensagem === "string" ? mensagem : "Confira os campos informados.");
    // as telas precisam dos campos de validação e dos preços devolvidos no conflito 409
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
  }
  if (!json) throw new Error("O servidor retornou uma resposta inválida. Tente novamente.");
  return dados;
}
