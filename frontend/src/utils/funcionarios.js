// Cargos que o gerente pode cadastrar. As permissões de cada um são definidas no backend.
export const cargos = {
  GARCOM: "Garçom",
  COZINHA: "Cozinha",
  BAR: "Bar",
};

export const descricaoDoCargo = {
  GARCOM: "Vê os pedidos, confirma entregas e atende as solicitações dos clientes.",
  COZINHA: "Vê os pedidos de comida e marca os itens como prontos.",
  BAR: "Vê os pedidos de bebida e marca os itens como prontos.",
};

// Para onde cada cargo vai depois do login.
export const paginaInicialDoCargo = {
  GERENTE: "/gerente",
  GARCOM: "/garcom",
  COZINHA: "/preparo",
  BAR: "/preparo",
};

export function formatarCpf(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(telefone) {
  return telefone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
}

// Confere o formulário antes de enviar. O servidor valida tudo de novo.
export function validarFuncionario(formulario, editando) {
  const erros = {};

  if (!formulario.nome.trim()) erros.nome = "Informe o nome.";
  if (!editando && formulario.cpf.length !== 11) erros.cpf = "Informe os 11 números do CPF.";
  if (formulario.tel.length < 10) erros.tel = "Informe o telefone com DDD.";
  if (formulario.salario === "" || Number(formulario.salario) < 0) erros.salario = "Informe um salário válido.";

  const senhaObrigatoria = !editando;
  if (senhaObrigatoria && !formulario.senha) erros.senha = "Informe uma senha.";
  else if (formulario.senha && formulario.senha.length < 8) erros.senha = "A senha precisa ter pelo menos 8 caracteres.";

  return erros;
}

// Monta os dados enviados à API a partir do formulário.
export function dadosDoFuncionario(formulario, editando) {
  const dados = {
    nome: formulario.nome.trim(),
    tel: formulario.tel,
    salario: formulario.salario,
    cargo: formulario.cargo,
  };

  // O CPF é o login e não muda depois do cadastro.
  if (!editando) dados.cpf = formulario.cpf;

  // Na edição, a senha só é trocada se o gerente digitar uma nova.
  if (formulario.senha) dados.senha = formulario.senha;

  return dados;
}
