import { useEffect, useRef, useState } from "react";
import { cargos, dadosDoFuncionario, descricaoDoCargo, validarFuncionario } from "../utils/funcionarios.js";

const campoClasse = "mt-1 w-full rounded-md border border-gray-400 bg-white p-2 text-header focus:outline-2 focus:outline-hover disabled:opacity-60";

function somenteNumeros(texto) {
  return texto.replace(/\D/g, "");
}

function Campo({ nome, rotulo, erros, children }) {
  const erro = erros[nome];
  return (
    <div>
      <label htmlFor={`funcionario-${nome}`} className="font-semibold">{rotulo}</label>
      {children}
      {erro && (
        <p className="mt-1 text-sm text-red-700">
          {Array.isArray(erro) ? erro.join(" ") : String(erro)}
        </p>
      )}
    </div>
  );
}

export default function FormFuncionario({ funcionario, salvando, erro, onSalvar, onCancelar }) {
  const dialogo = useRef(null);
  const editando = Boolean(funcionario);
  const [formulario, setFormulario] = useState({
    nome: funcionario?.nome || "",
    cpf: funcionario?.cpf || "",
    tel: funcionario?.tel || "",
    salario: funcionario?.salario ?? "",
    cargo: funcionario?.cargo || "GARCOM",
    senha: "",
  });
  const [errosLocais, setErrosLocais] = useState({});

  // Junta os erros devolvidos pelo servidor com os encontrados no navegador.
  const errosCampos = { ...(erro?.dados || {}), ...errosLocais };

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento.open) elemento.showModal();
    return () => elemento.close();
  }, []);

  function alterar(evento) {
    const { name, value } = evento.target;
    const apenasNumeros = name === "cpf" || name === "tel";
    setFormulario((anterior) => ({ ...anterior, [name]: apenasNumeros ? somenteNumeros(value) : value }));
    setErrosLocais((anteriores) => ({ ...anteriores, [name]: undefined }));
  }

  function salvar(evento) {
    evento.preventDefault();
    if (salvando) return;

    const erros = validarFuncionario(formulario, editando);
    setErrosLocais(erros);
    if (Object.keys(erros).length > 0) return;

    onSalvar(dadosDoFuncionario(formulario, editando));
  }

  function cancelar(evento) {
    evento.preventDefault();
    if (!salvando) onCancelar();
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-funcionario"
      onCancel={cancelar}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl bg-fundo p-5 text-header shadow-2xl backdrop:bg-black/60 sm:p-6"
    >
      <form onSubmit={salvar} noValidate aria-busy={salvando}>
        <h2 id="titulo-funcionario" className="mb-4 text-2xl font-bold">
          {editando ? "Editar usuário" : "Novo usuário"}
        </h2>

        {erro && <p role="alert" className="mb-4 rounded-md bg-red-100 p-3 text-red-800">{erro.message}</p>}

        <fieldset disabled={salvando} className="space-y-4">
          <Campo nome="nome" rotulo="Nome *" erros={errosCampos}>
            <input id="funcionario-nome" name="nome" value={formulario.nome} onChange={alterar} maxLength={50} autoFocus className={campoClasse} />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="cpf" rotulo="CPF (usado no login) *" erros={errosCampos}>
              <input id="funcionario-cpf" name="cpf" inputMode="numeric" value={formulario.cpf} onChange={alterar} maxLength={11} disabled={editando} className={campoClasse} />
            </Campo>
            <Campo nome="tel" rotulo="Telefone com DDD *" erros={errosCampos}>
              <input id="funcionario-tel" name="tel" inputMode="numeric" value={formulario.tel} onChange={alterar} maxLength={11} className={campoClasse} />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="salario" rotulo="Salário (R$) *" erros={errosCampos}>
              <input id="funcionario-salario" name="salario" type="number" min="0" step="0.01" value={formulario.salario} onChange={alterar} className={campoClasse} />
            </Campo>
            <Campo nome="cargo" rotulo="Cargo *" erros={errosCampos}>
              <select id="funcionario-cargo" name="cargo" value={formulario.cargo} onChange={alterar} className={campoClasse}>
                {Object.entries(cargos).map(([valor, nome]) => (
                  <option key={valor} value={valor}>{nome}</option>
                ))}
              </select>
            </Campo>
          </div>
          <p className="text-sm">{descricaoDoCargo[formulario.cargo]}</p>

          <Campo nome="senha" rotulo={editando ? "Nova senha" : "Senha *"} erros={errosCampos}>
            <input id="funcionario-senha" name="senha" type="password" autoComplete="new-password" value={formulario.senha} onChange={alterar} className={campoClasse} />
            {editando && <p className="mt-1 text-sm">Deixe em branco para manter a senha atual.</p>}
          </Campo>
        </fieldset>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancelar} disabled={salvando} className="rounded-md border border-gray-400 bg-white px-4 py-2 font-semibold disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {salvando ? "Salvando…" : "Salvar usuário"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
