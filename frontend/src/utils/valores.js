// Trabalha com centavos inteiros para não somar valores como 0.1 + 0.2 em ponto flutuante.
export function paraCentavos(valor) {
  const texto = String(valor);
  if (!/^-?\d+(\.\d{1,2})?$/.test(texto)) throw new Error("Preço inválido.");
  const [inteiro, fracao = ""] = texto.replace("-", "").split(".");
  const centavos = (Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"))) * (texto.startsWith("-") ? -1 : 1);
  if (!Number.isSafeInteger(centavos)) throw new Error("Preço fora do limite.");
  return centavos;
}

export function deCentavos(centavos) {
  // BigInt mantém exatos os totais de várias linhas, mesmo acima do limite de Number.
  if (typeof centavos !== "bigint" && !Number.isSafeInteger(centavos)) throw new Error("Total inválido.");
  const inteiro = BigInt(centavos);
  const texto = String(inteiro < 0n ? -inteiro : inteiro).padStart(3, "0");
  return `${inteiro < 0n ? "-" : ""}${texto.slice(0, -2)}.${texto.slice(-2)}`;
}

export function calcularPrecoPromocional(preco, percentual) {
  const original = paraCentavos(preco);
  const desconto = Number(percentual);
  if (original <= 0 || !Number.isFinite(desconto) || desconto <= 0 || desconto >= 100) {
    throw new Error("Informe preço positivo e percentual maior que 0 e menor que 100.");
  }
  const final = Number(preco) * (1 - desconto / 100);
  // Casas extras distinguem o erro do float (2.675 fica abaixo do empate) de um empate exato.
  const [inteiro, decimais] = final.toFixed(100).split(".");
  let centavos = BigInt(inteiro + decimais.slice(0, 2));
  const resto = decimais.slice(2);
  // Frações com o mesmo tamanho podem ser comparadas como texto sem perder precisão.
  const metade = "5".padEnd(resto.length, "0");
  // Em empate, escolhe o centavo par, como round(..., 2) do Python.
  if (resto > metade || (resto === metade && centavos % 2n !== 0n)) centavos++;
  if (centavos <= 0n || centavos >= BigInt(original)) {
    throw new Error("O desconto não produz um preço promocional válido para este produto.");
  }
  return deCentavos(centavos);
}
