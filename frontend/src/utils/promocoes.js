import { calcularPrecoPromocional, deCentavos, paraCentavos } from "./valores.js";

// O horário da promoção é sempre o do bar, mesmo se o navegador estiver em outro fuso.
const FUSO = "America/Sao_Paulo";

// Data da API -> valor do campo datetime-local ("2026-11-12T20:00").
// O formato sueco (sv-SE) já escreve a data como AAAA-MM-DD HH:MM.
export function dataParaCampo(valor) {
  const texto = new Date(valor).toLocaleString("sv-SE", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
  return texto.replace(" ", "T");
}

// Data da API -> texto para mostrar na tela ("12/11/2026, 20:00").
export function formatarDataPromocao(valor) {
  return new Date(valor).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
}

export function previaPromocao(preco, percentual) {
  // A prévia usa a mesma regra do backend; a cobrança é definida pelo servidor.
  const precoFinal = calcularPrecoPromocional(preco, percentual);
  return {
    preco_final: precoFinal,
    desconto_unitario: deCentavos(paraCentavos(preco) - paraCentavos(precoFinal)),
  };
}

// Confere o formulário antes de enviar. O servidor valida tudo de novo.
export function validarPromocao(formulario) {
  const erros = {};
  const percentual = Number(formulario.desconto_percentual);

  if (!formulario.nome.trim()) erros.nome = "Informe o nome da promoção.";
  if (!(percentual > 0 && percentual < 100)) {
    erros.desconto_percentual = "Informe um percentual maior que zero e menor que 100.";
  }
  if (!formulario.data_inicio) erros.data_inicio = "Informe a data e o horário de início.";
  if (!formulario.data_fim) erros.data_fim = "Informe a data e o horário de fim.";
  // As duas datas têm o mesmo formato, então a comparação de texto segue a ordem do tempo.
  else if (formulario.data_fim <= formulario.data_inicio) erros.data_fim = "O fim deve ser posterior ao início.";
  if (formulario.itens.length === 0) erros.itens = "Selecione pelo menos um produto.";

  return erros;
}

// Monta os dados enviados à API. As datas vão sem fuso, como foram digitadas:
// o servidor as interpreta no horário de São Paulo.
export function dadosDaPromocao(formulario) {
  return {
    nome: formulario.nome.trim(),
    descricao: formulario.descricao,
    desconto_percentual: Number(formulario.desconto_percentual),
    data_inicio: formulario.data_inicio,
    data_fim: formulario.data_fim,
    itens: formulario.itens,
  };
}
