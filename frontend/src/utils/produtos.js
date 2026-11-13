export const IMAGEM_PADRAO = "/media/itens/default.png";

// Valores iniciais do formulário, a partir do produto em edição (ou vazios no cadastro).
export function formularioDoProduto(produto) {
  return {
    nome: produto?.nome || "",
    descricao: produto?.descricao || "",
    preco_unitario: produto?.preco_unitario || "",
    categoria_id: produto?.categoria?.id || "",
    disponivel: produto?.disponivel ?? true,
    peso: produto?.peso || "",
    tempo_preparo_minutos: produto?.tempo_preparo_minutos || "",
    ponto_carne: produto?.ponto_carne || "",
    teor_alcoolico: produto?.teor_alcoolico ?? "",
    volume_ml: produto?.volume_ml || "",
    imagem: null,
  };
}

// Confere o formulário antes de enviar. Retorna a mensagem de erro, ou "" se estiver tudo certo.
// O servidor valida tudo de novo.
export function validarProduto(formulario, tipoCategoria) {
  if (!formulario.preco_unitario || Number(formulario.preco_unitario) <= 0) {
    return "O preço do produto é obrigatório e deve ser maior que zero!";
  }

  if (tipoCategoria === "PRATO") {
    if (!formulario.peso || Number(formulario.peso) < 1) {
      return "O peso é obrigatório para pratos e deve ser de no mínimo 1g.";
    }
    if (!formulario.tempo_preparo_minutos || Number(formulario.tempo_preparo_minutos) < 1) {
      return "O tempo de preparo é obrigatório para pratos e deve ser de no mínimo 1 minuto.";
    }
  }

  if (tipoCategoria === "BEBIDA") {
    if (!formulario.volume_ml || Number(formulario.volume_ml) < 1) {
      return "O volume é obrigatório para bebidas e deve ser de no mínimo 1 ml.";
    }
    const teor = Number(formulario.teor_alcoolico);
    if (formulario.teor_alcoolico === "" || !Number.isFinite(teor) || teor < 0 || teor > 100) {
      return "Informe um teor alcoólico entre 0 e 100%. Use 0 para bebidas sem álcool.";
    }
  }

  return "";
}

// Monta os dados enviados à API. Usa FormData porque o produto pode ter uma foto.
export function dadosDoProduto(formulario, tipoCategoria) {
  const dados = new FormData();
  dados.append("nome", formulario.nome.trim());
  dados.append("descricao", formulario.descricao);
  dados.append("preco_unitario", formulario.preco_unitario);
  dados.append("categoria_id", formulario.categoria_id);
  dados.append("disponivel", formulario.disponivel);

  if (formulario.imagem) dados.append("imagem", formulario.imagem);

  // Cada tipo de categoria tem seus próprios campos.
  if (tipoCategoria === "PRATO") {
    dados.append("peso", formulario.peso);
    dados.append("tempo_preparo_minutos", formulario.tempo_preparo_minutos);
    if (formulario.ponto_carne) dados.append("ponto_carne", formulario.ponto_carne);
  }

  if (tipoCategoria === "BEBIDA") {
    dados.append("volume_ml", formulario.volume_ml);
    dados.append("teor_alcoolico", formulario.teor_alcoolico);
  }

  return dados;
}
