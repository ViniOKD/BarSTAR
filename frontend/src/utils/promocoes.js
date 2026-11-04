import { calcularPrecoPromocional, deCentavos, paraCentavos } from "./valores.js";

// O horário da promoção pertence ao bar, mesmo se o navegador estiver em outro fuso.
const fuso = "America/Sao_Paulo";
const formatoCampo = new Intl.DateTimeFormat("sv-SE", {
  timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const formatoExibicao = new Intl.DateTimeFormat("pt-BR", {
  timeZone: fuso, dateStyle: "short", timeStyle: "short",
});

function instante(valor) {
  // Exige o fuso recebido da API para o navegador não assumir o seu horário local.
  if (typeof valor !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(valor)) {
    throw new Error("Informe uma data com fuso horário.");
  }
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) throw new Error("Informe uma data válida.");
  return data;
}

export function dataParaCampo(valor) {
  const partes = Object.fromEntries(formatoCampo.formatToParts(instante(valor)).map(({ type, value }) => [type, value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

export function campoParaData(valor) {
  // datetime-local não traz fuso: interpreta o horário digitado como São Paulo.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) throw new Error("Informe uma data e um horário válidos.");
  const localUtc = Date.parse(`${valor}:00.000Z`);
  // Date aceita alguns dias inválidos e os avança para o mês seguinte.
  if (!Number.isFinite(localUtc) || new Date(localUtc).toISOString().slice(0, 16) !== valor) {
    throw new Error("Informe uma data e um horário válidos.");
  }
  let ajustado = localUtc;
  // Consulta o fuso da casa, inclusive para datas históricas com horário de verão.
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    ajustado += localUtc - Date.parse(`${dataParaCampo(new Date(ajustado).toISOString())}:00.000Z`);
  }
  const resultado = new Date(ajustado).toISOString();
  if (dataParaCampo(resultado) !== valor) throw new Error("Este horário não existe no fuso de São Paulo.");
  return resultado;
}

export function formatarDataPromocao(valor) {
  return formatoExibicao.format(instante(valor));
}

export function previaPromocao(preco, percentual) {
  // A prévia usa a mesma regra do backend; a cobrança é definida pelo servidor.
  const precoFinal = calcularPrecoPromocional(preco, percentual);
  return {
    preco_final: precoFinal,
    desconto_unitario: deCentavos(paraCentavos(preco) - paraCentavos(precoFinal)),
  };
}

export function prepararPromocao(formulario, produtos, promocao) {
  const erros = {};
  const nome = formulario.nome.trim();
  if (!nome || nome.length > 50) erros.nome = "Informe um nome com até 50 caracteres.";
  const percentual = Number(formulario.desconto_percentual);
  if (typeof formulario.desconto_percentual === "boolean" || !Number.isFinite(percentual) || percentual <= 0 || percentual >= 100) {
    erros.desconto_percentual = "Informe um percentual maior que zero e menor que 100.";
  }
  const datas = {};
  for (const campo of ["data_inicio", "data_fim"]) {
    try {
      // O campo mostra só minutos; preserva os segundos originais se a data não mudou.
      datas[campo] = promocao && dataParaCampo(promocao[campo]) === formulario[campo]
        ? promocao[campo] : campoParaData(formulario[campo]);
    }
    catch (erro) { erros[campo] = erro.message; }
  }
  if (datas.data_inicio && datas.data_fim && Date.parse(datas.data_fim) <= Date.parse(datas.data_inicio)) {
    erros.data_fim = "O fim deve ser posterior ao início.";
  }
  const ids = formulario.itens;
  if (!ids.length) erros.itens = "Selecione pelo menos um produto.";
  else if (new Set(ids).size !== ids.length) erros.itens = "Não repita um produto na promoção.";
  else {
    for (const id of ids) {
      const produto = produtos.find((item) => item.id === id);
      if (!Number.isInteger(id) || id <= 0 || !produto) {
        erros.itens = `Produto #${id} não encontrado. Recarregue a lista de produtos.`;
        break;
      }
      if (!erros.desconto_percentual) {
        try { calcularPrecoPromocional(produto.preco_unitario, percentual); }
        catch (erro) { erros.itens = `${produto.nome}: ${erro.message}`; break; }
      }
    }
  }
  return {
    erros,
    // Envia somente os campos editáveis; o servidor define o gerente responsável.
    dados: Object.keys(erros).length ? null : {
      nome, descricao: formulario.descricao || "", desconto_percentual: percentual,
      ...datas, itens: ids,
    },
  };
}
