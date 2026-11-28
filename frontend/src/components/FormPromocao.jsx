import { useEffect, useRef, useState } from "react";
import formatarPreco from "../utils/formatarPreco.js";
import { dadosDaPromocao, dataParaCampo, formatarDataPromocao, previaPromocao, validarPromocao } from "../utils/promocoes.js";

const campoClasse = "mt-1 w-full rounded-md border border-gray-400 bg-white p-2 text-header focus:outline-2 focus:outline-hover disabled:opacity-60";

function ErroCampo({ campo, erros }) {
  if (!erros[campo]) return null;
  return <p id={`erro-${campo}`} className="mt-1 text-sm text-red-700">{Array.isArray(erros[campo]) ? erros[campo].join(" ") : String(erros[campo])}</p>;
}

export default function FormPromocao({ promocao, produtos, salvando, erros, onSalvar, onCancelar }) {
  const dialogo = useRef(null);
  const [formulario, setFormulario] = useState(() => ({
    nome: promocao?.nome || "",
    descricao: promocao?.descricao || "",
    desconto_percentual: promocao?.desconto_percentual ?? "",
    data_inicio: promocao ? dataParaCampo(promocao.data_inicio) : "",
    data_fim: promocao ? dataParaCampo(promocao.data_fim) : "",
    itens: promocao?.itens_promocao.map(({ item }) => item.id) || [],
  }));
  const [errosLocais, setErrosLocais] = useState({});
  const errosCampos = { ...(erros?.dados || {}), ...errosLocais };

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento.open) elemento.showModal();
    return () => elemento.close();
  }, []);

  function alterar(evento) {
    const { name, value } = evento.target;
    setFormulario((anterior) => ({ ...anterior, [name]: value }));
    setErrosLocais((anteriores) => ({ ...anteriores, [name]: undefined }));
  }

  function salvar(evento) {
    evento.preventDefault();
    if (salvando) return;
    const erros = validarPromocao(formulario);
    setErrosLocais(erros);
    const primeiroCampoComErro = Object.keys(erros)[0];
    if (primeiroCampoComErro) {
      evento.currentTarget.querySelector(`[name="${primeiroCampoComErro}"]`)?.focus();
      return;
    }
    onSalvar(dadosDaPromocao(formulario));
  }

  function selecionar(id, selecionado) {
    setFormulario((anterior) => ({
      ...anterior, itens: selecionado ? [...anterior.itens, id] : anterior.itens.filter((item) => item !== id),
    }));
    setErrosLocais((anteriores) => ({ ...anteriores, itens: undefined }));
  }

  return (
    <dialog ref={dialogo} aria-labelledby="titulo-promocao" onCancel={(evento) => {
      evento.preventDefault();
      if (!salvando) onCancelar();
    }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl bg-fundo p-5 text-header shadow-2xl backdrop:bg-black/60 sm:p-6">
      <form onSubmit={salvar} noValidate aria-busy={salvando}>
        <h2 id="titulo-promocao" className="mb-2 text-2xl font-bold">{promocao ? "Editar promoção" : "Nova promoção"}</h2>
        <p className="mb-4 text-sm">{promocao ? `Criada pelo gerente #${promocao.gerente}.` : ""}</p>

        {erros && <div role="alert" className="mb-4 rounded-md bg-red-100 p-3 text-red-800">
          <p>{erros.message}</p>
          {erros.dados?.conflitos?.length > 0 && <ul className="mt-2 list-disc pl-5">
            {erros.dados.conflitos.map((conflito, indice) => <li key={`${conflito.item_id}-${conflito.promocao_id}-${indice}`}>
              {conflito.produto}: “{conflito.promocao}”, de {formatarDataPromocao(conflito.data_inicio)} até {formatarDataPromocao(conflito.data_fim)} (São Paulo).
            </li>)}
          </ul>}
          {(erros.status === 401 || erros.status === 403) && <a href="/configuracoes" className="mt-2 inline-block underline">Acessar login do gerente</a>}
        </div>}
        {Object.values(errosLocais).some(Boolean) && <p role="alert" className="mb-3 text-red-700">Revise os campos indicados antes de salvar.</p>}

        <fieldset disabled={salvando} className="space-y-4">
          <div>
            <label htmlFor="promocao-nome" className="font-semibold">Nome *</label>
            <input id="promocao-nome" name="nome" value={formulario.nome} onChange={alterar} maxLength={50} required autoFocus className={campoClasse} aria-invalid={Boolean(errosCampos.nome)} aria-describedby="erro-nome" />
            <ErroCampo campo="nome" erros={errosCampos} />
          </div>
          <div>
            <label htmlFor="promocao-descricao" className="font-semibold">Descrição</label>
            <textarea id="promocao-descricao" name="descricao" value={formulario.descricao} onChange={alterar} rows={2} className={campoClasse} aria-invalid={Boolean(errosCampos.descricao)} aria-describedby="erro-descricao" />
            <ErroCampo campo="descricao" erros={errosCampos} />
          </div>
          <div>
            <label htmlFor="promocao-percentual" className="font-semibold">Desconto percentual comum (%) *</label>
            <input id="promocao-percentual" name="desconto_percentual" type="number" inputMode="decimal" min="0" max="100" step="0.01" required value={formulario.desconto_percentual} onChange={alterar} className={campoClasse} aria-invalid={Boolean(errosCampos.desconto_percentual)} aria-describedby="erro-desconto_percentual" />
            <ErroCampo campo="desconto_percentual" erros={errosCampos} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="promocao-inicio" className="font-semibold">Início *</label>
              <input id="promocao-inicio" name="data_inicio" type="datetime-local" required value={formulario.data_inicio} onChange={alterar} className={campoClasse} aria-invalid={Boolean(errosCampos.data_inicio)} aria-describedby="fuso-promocao erro-data_inicio" />
              <ErroCampo campo="data_inicio" erros={errosCampos} />
            </div>
            <div>
              <label htmlFor="promocao-fim" className="font-semibold">Fim *</label>
              <input id="promocao-fim" name="data_fim" type="datetime-local" required value={formulario.data_fim} onChange={alterar} className={campoClasse} aria-invalid={Boolean(errosCampos.data_fim)} aria-describedby="fuso-promocao erro-data_fim" />
              <ErroCampo campo="data_fim" erros={errosCampos} />
            </div>
          </div>
          <fieldset aria-describedby="ajuda-participantes erro-itens">
            <legend className="font-semibold">Produtos participantes * ({formulario.itens.length} selecionados)</legend>
            <p id="ajuda-participantes" className="my-2 text-sm">Selecione um ou mais produtos.</p>
            <ErroCampo campo="itens" erros={errosCampos} />
            {!produtos.length && <p className="my-3">Nenhum produto cadastrado. Cadastre um produto antes de criar a promoção.</p>}
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-2">
              {produtos.map((produto) => {
                let previa;
                try { previa = previaPromocao(produto.preco_unitario, formulario.desconto_percentual); }
                catch { previa = null; }
                return <label key={produto.id} className="flex cursor-pointer items-start gap-3 rounded-md bg-white p-3 focus-within:outline-2 focus-within:outline-hover">
                  <input name="itens" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" checked={formulario.itens.includes(produto.id)} onChange={(evento) => selecionar(produto.id, evento.target.checked)} aria-invalid={Boolean(errosCampos.itens)} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold">{produto.nome}{!produto.disponivel && <span className="ml-2 text-sm font-normal text-red-700">Indisponível</span>}</span>
                    <span className="block text-sm">Normal: {formatarPreco(produto.preco_unitario)} · {previa ? <>Economia: {formatarPreco(previa.desconto_unitario)} · Prévia: <strong>{formatarPreco(previa.preco_final)}</strong></> : "Ajuste o percentual para obter um preço válido."}</span>
                  </span>
                </label>;
              })}
            </div>
          </fieldset>
        </fieldset>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancelar} disabled={salvando} className="rounded-md border border-gray-400 bg-white px-4 py-2 font-semibold disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={salvando || !produtos.length} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{salvando ? "Salvando…" : "Salvar promoção"}</button>
        </div>
      </form>
    </dialog>
  );
}
