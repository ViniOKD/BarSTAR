// Os preços chegam da API como texto ("12.50"). As contas são feitas em centavos
// inteiros, porque somar valores como 0.1 + 0.2 em ponto flutuante dá erro.

// "12.50" -> 1250
export function paraCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

// 1250 -> "12.50"
export function deCentavos(centavos) {
  return (centavos / 100).toFixed(2);
}

// Calcula o preço com desconto usando a mesma regra do backend:
// percentual com até duas casas decimais e meio centavo arredondado para cima.
export function calcularPrecoPromocional(preco, percentual) {
  const original = paraCentavos(preco);
  // Guarda o percentual em centésimos para a conta ficar só com inteiros: 12.5% -> 1250
  const desconto = Math.round(Number(percentual) * 100);

  if (!(original > 0) || !(desconto > 0 && desconto < 10000)) {
    throw new Error("Informe preço positivo e percentual maior que 0 e menor que 100.");
  }

  const final = Math.round((original * (10000 - desconto)) / 10000);

  if (final <= 0 || final >= original) {
    throw new Error("O desconto não produz um preço promocional válido para este produto.");
  }

  return deCentavos(final);
}
