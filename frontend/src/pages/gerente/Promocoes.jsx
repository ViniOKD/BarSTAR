import { useCallback, useEffect, useRef, useState } from "react";
import FormPromocao from "../../components/FormPromocao.jsx";
import { requisicaoApi } from "../../utils/api.js";
import { formatarDataPromocao } from "../../utils/promocoes.js";

const situacoes = { AGENDADA: "Agendada", VIGENTE: "Vigente", ENCERRADA: "Encerrada" };

function ConfirmarRemocao({ promocao, removendo, erro, onCancelar, onConfirmar }) {
  const dialogo = useRef(null);
  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento.open) elemento.showModal();
    return () => elemento.close();
  }, []);
  return <dialog ref={dialogo} aria-labelledby="titulo-remocao" aria-describedby="descricao-remocao" onCancel={(evento) => {
    evento.preventDefault();
    if (!removendo) onCancelar();
  }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-fundo p-6 text-header shadow-2xl backdrop:bg-black/60">
    <h2 id="titulo-remocao" className="mb-3 text-xl font-bold">Remover promoção?</h2>
    <p id="descricao-remocao">Remover “{promocao.nome}” encerra sua aplicação nas próximas vendas. O histórico das vendas permanece preservado.</p>
    {erro && <div role="alert" className="mt-4 rounded-md bg-red-100 p-3 text-red-800">
      <p>{erro.message}</p>
      {(erro.status === 401 || erro.status === 403) && <a href="/configuracoes" className="underline">Acessar login do gerente</a>}
    </div>}
    <div className="mt-5 flex flex-wrap justify-end gap-3" aria-busy={removendo}>
      <button type="button" autoFocus onClick={onCancelar} disabled={removendo} className="rounded-md border border-gray-400 bg-white px-4 py-2 font-semibold disabled:opacity-60">Cancelar</button>
      <button type="button" onClick={onConfirmar} disabled={removendo} className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60">{removendo ? "Removendo…" : "Remover promoção"}</button>
    </div>
  </dialog>;
}

export default function Promocoes() {
  const [promocoes, setPromocoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [paraRemover, setParaRemover] = useState(null);
  const [erroEscrita, setErroEscrita] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const escritaEmCurso = useRef(false);

  const carregar = useCallback((signal) => Promise.all([
    requisicaoApi("/api/promocoes/", { signal }),
    requisicaoApi("/api/itens/", { signal }),
  ]).then(([lista, itens]) => {
      if (signal?.aborted) return;
      setPromocoes(lista.results || lista);
      setProdutos(itens.results || itens);
    }).catch((erro) => {
      if (!signal?.aborted) setErroLista(erro);
    }).finally(() => {
      if (!signal?.aborted) setCarregando(false);
    }), []);

  useEffect(() => {
    const controlador = new AbortController();
    carregar(controlador.signal);
    return () => controlador.abort();
  }, [carregar]);

  function abrirFormulario(promocao = null) {
    setErroEscrita(null);
    setMensagem("");
    setFormulario({ promocao });
  }

  async function salvar(dados) {
    if (escritaEmCurso.current) return;
    escritaEmCurso.current = true;
    setGravando(true);
    setErroEscrita(null);
    const id = formulario.promocao?.id;
    try {
      const salva = await requisicaoApi(id ? `/api/promocoes/${id}/` : "/api/promocoes/", {
        method: id ? "PATCH" : "POST", body: JSON.stringify(dados),
      });
      setPromocoes((anteriores) => id ? anteriores.map((item) => item.id === id ? salva : item) : [salva, ...anteriores]);
      setFormulario(null);
      setMensagem(id ? "Promoção atualizada." : "Promoção criada.");
    } catch (erro) {
      setErroEscrita(erro);
    } finally {
      escritaEmCurso.current = false;
      setGravando(false);
    }
  }

  async function remover() {
    if (escritaEmCurso.current) return;
    escritaEmCurso.current = true;
    setGravando(true);
    setErroEscrita(null);
    try {
      await requisicaoApi(`/api/promocoes/${paraRemover.id}/`, { method: "DELETE" });
      setPromocoes((anteriores) => anteriores.filter((item) => item.id !== paraRemover.id));
      setParaRemover(null);
      setMensagem("Promoção removida. O histórico das vendas foi preservado.");
    } catch (erro) {
      setErroEscrita(erro);
    } finally {
      escritaEmCurso.current = false;
      setGravando(false);
    }
  }

  return <div className="pb-8 text-header">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-header text-3xl font-bold">Promoções</h1>
      <button type="button" onClick={() => abrirFormulario()} disabled={carregando || Boolean(erroLista)} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Nova promoção</button>
    </div>
    <p className="mb-4 text-sm">Percentual comum aos produtos selecionados. Horários de São Paulo (America/Sao_Paulo).</p>
    {mensagem && <p role="status" className="mb-4 rounded-md bg-emerald-100 p-3 text-emerald-900">{mensagem}</p>}
    {carregando ? <p role="status">Carregando promoções e produtos…</p> : erroLista ? <div role="alert" className="rounded-md bg-red-100 p-4 text-red-800">
      <p>{erroLista.message}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        <button type="button" onClick={() => { setCarregando(true); setErroLista(null); carregar(); }} className="rounded-md border border-red-700 px-3 py-2 font-semibold">Tentar novamente</button>
        {(erroLista.status === 401 || erroLista.status === 403) && <a href="/configuracoes" className="self-center underline">Acessar login do gerente</a>}
      </div>
    </div> : !promocoes.length ? <p className="rounded-xl border border-gray-200 bg-white p-6">Nenhuma promoção cadastrada.</p> : <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[650px] text-left text-sm">
        <caption className="sr-only">Promoções cadastradas</caption>
        <thead className="bg-destaque"><tr>
          {['Nome', 'Desconto', 'Período (São Paulo)', 'Situação', 'Produtos', 'Ações'].map((titulo) => <th key={titulo} scope="col" className="p-3 font-semibold">{titulo}</th>)}
        </tr></thead>
        <tbody>{promocoes.map((promocao) => <tr key={promocao.id} className="border-t border-gray-200">
          <th scope="row" className="max-w-48 break-words p-3 font-semibold">{promocao.nome}</th>
          <td className="p-3">{Number(promocao.desconto_percentual).toLocaleString("pt-BR", { maximumFractionDigits: 20 })}%</td>
          <td className="p-3"><span className="block">{formatarDataPromocao(promocao.data_inicio)}</span><span className="block">até {formatarDataPromocao(promocao.data_fim)}</span></td>
          <td className="p-3">{situacoes[promocao.situacao] || promocao.situacao}</td>
          <td className="p-3">{promocao.itens_promocao.length}</td>
          <td className="p-3"><div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => abrirFormulario(promocao)} aria-label={`Editar ${promocao.nome}`} className="font-semibold text-emerald-800 underline">Editar</button>
            <button type="button" onClick={() => { setErroEscrita(null); setMensagem(""); setParaRemover(promocao); }} aria-label={`Remover ${promocao.nome}`} className="font-semibold text-red-700 underline">Remover</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {formulario && <FormPromocao promocao={formulario.promocao} produtos={produtos} salvando={gravando} erros={erroEscrita} onSalvar={salvar} onCancelar={() => { if (!escritaEmCurso.current) setFormulario(null); }} />}
    {paraRemover && <ConfirmarRemocao promocao={paraRemover} removendo={gravando} erro={erroEscrita} onConfirmar={remover} onCancelar={() => { if (!escritaEmCurso.current) setParaRemover(null); }} />}
  </div>;
}
