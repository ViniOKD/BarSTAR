// Atualiza o cadastro e o preço, preservando quantidade, observações e identidade da linha
export function atualizarPrecosCarrinho(itens, produtos) {
  const porId = new Map(produtos.map(produto => [produto.id, produto]));
  return itens.map(linha => {
    const produto = porId.get(linha.id);
    // A consulta retorna só os disponíveis; um produto ausente continua visível para remoção
    if (!produto) return { ...linha, disponivel: false };
    return { ...linha, ...produto, idItemPedido: linha.idItemPedido,
      quantidade: linha.quantidade, observacoes: linha.observacoes };
  });
}

export function aplicarPrecosAlterados(itens, alterados) {
  // o produto pode aparecer em várias linhas, com quantidades e observações diferentes
  const porId = new Map(alterados.map(item => [item.item_id, item]));
  return itens.map(linha => {
    const info = porId.get(linha.id);
    return info ? { ...linha, preco_atual: info.preco_atual, promocao_atual: info.promocao_atual } : linha;
  });
}

export function dadosEnvioPedido(comandaId, itens) {
  return {
    comanda_id: Number(comandaId),
    itens: itens.map(item => ({
      item_id: item.id,
      quantidade: item.quantidade,
      // mantém a string decimal da API
      preco_esperado: item.preco_atual,
      observacoes: item.observacoes || "",
    })),
  };
}
