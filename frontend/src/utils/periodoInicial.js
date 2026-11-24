// Últimos 30 dias, no fuso local do navegador.
export default function periodoInicial() {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 29);
  const dataLocal = (data) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  return { data_inicio: dataLocal(inicio), data_fim: dataLocal(fim) };
}
