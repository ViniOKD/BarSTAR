// O status mostrado na tela considera comanda aberta e reserva próxima do horário.
export function statusDaMesa(mesa) {
  return mesa.status_dinamico || mesa.status;
}

const corDoStatus = {
  LIVRE: "bg-emerald-100 text-emerald-700",
  OCUPADA: "bg-red-100 text-red-700",
  RESERVADA: "bg-yellow-100 text-yellow-700",
  INATIVA: "bg-gray-200 text-gray-700",
  AGRUPADA: "bg-yellow-100 text-yellow-700 border border-yellow-300",
};

export function estiloDoStatus(status) {
  const cor = corDoStatus[status] || "bg-gray-100 text-gray-800";
  return `px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide inline-block ${cor}`;
}

// Data de hoje no formato AAAA-MM-DD, no horário local.
// toISOString usaria UTC e viraria o dia às 21h.
export function hojeLocal() {
  return new Date().toLocaleDateString("sv-SE");
}

export function reservaVazia() {
  return {
    cliente_nome: "",
    cliente_telefone: "",
    data_reserva: hojeLocal(),
    hora_reserva: "19:00",
    mesas_agrupadas_ids: [],
  };
}
