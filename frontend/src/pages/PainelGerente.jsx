import { useState } from "react";
import { AvisoErro } from "../components/gerente/Avisos.jsx";
import { useDadosApi } from "../hooks/useDadosApi.js";
import formatarPreco from "../utils/formatarPreco.js";

function periodoInicial() {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 29);
  const dataLocal = (data) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  return { data_inicio: dataLocal(inicio), data_fim: dataLocal(fim) };
}

function Secao({ titulo, descricao, children }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-xl font-bold text-header font-header">{titulo}</h2>
        <p className="text-sm text-gray-500 mt-1">{descricao}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Indicadores({ consulta }) {
  const { dados, erro, carregando, recarregar } = useDadosApi([`/api/gerente/dashboard/?${consulta}`]);
  if (carregando) return <p role="status" className="text-header font-bold p-4">Buscando indicadores...</p>;
  if (erro) return (
    <div>
      <AvisoErro mensagem={erro} />
      <button onClick={recarregar} className="bg-hover text-header px-4 py-2 rounded-md font-bold cursor-pointer">Tentar novamente</button>
    </div>
  );

  const [painel] = dados;
  const percentual = (valor) => `${(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const tabela = "w-full text-left text-header";
  const cabecalho = "bg-gray-50 border-b border-gray-200 text-sm";
  const linha = "border-b border-gray-100 last:border-0 hover:bg-fundo";

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">{painel.total_comandas} comandas finalizadas no período selecionado.</p>
      <Secao titulo="Produtos mais vendidos" descricao="Unidades vendidas e participação no total. Produtos sem venda aparecem com zero.">
        {painel.produtos.length === 0 ? <p className="p-5 text-gray-500">Nenhum produto cadastrado.</p> : (
          <table className={tabela}>
            <thead className={cabecalho}><tr><th scope="col" className="p-4">Produto</th><th scope="col" className="p-4 text-right">Unidades vendidas</th><th scope="col" className="p-4 text-right">Participação</th></tr></thead>
            <tbody>{painel.produtos.map((produto) => (
              <tr key={produto.id} className={linha}><td className="p-4 font-bold">{produto.nome}</td><td className="p-4 text-right">{produto.quantidade}</td><td className="p-4 text-right">{percentual(produto.participacao)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Secao>

      <Secao titulo="Produtos frequentemente adquiridos em conjunto" descricao="Support ≥ 1%, confidence ≥ 30%, lift ≥ 1,2 e pelo menos 5 comandas. Ordenados por lift, confidence e ocorrências.">
        <p className="px-5 pt-4 text-sm text-gray-500">Support: presença do par nas comandas. Confidence: frequência de B entre quem compra A. Lift: força da associação em relação à frequência geral de B.</p>
        {painel.associacoes.length === 0 ? <p className="p-5 text-gray-500">Nenhuma associação atende aos critérios no período selecionado.</p> : (
          <table className={tabela}>
            <thead className={cabecalho}><tr>
              {['Produto A → Produto B', 'Comandas', 'Support', 'Confidence', 'Lift'].map((titulo) => <th key={titulo} scope="col" className="p-4 whitespace-nowrap">{titulo}</th>)}
            </tr></thead>
            <tbody>{painel.associacoes.map((par) => (
              <tr key={`${par.antecedente}-${par.consequente}`} className={linha}>
                <td className="p-4 font-bold">{par.nome_antecedente} → {par.nome_consequente}</td>
                <td className="p-4">{par.ocorrencias}</td><td className="p-4">{percentual(par.support)}</td>
                <td className="p-4">{percentual(par.confidence)}</td><td className="p-4">{par.lift.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Secao>

      <Secao titulo="Desempenho de promoções" descricao="Unidades vendidas com promoção e faturamento efetivo, considerando o preço registrado na venda. Ordenadas por faturamento.">
        {painel.promocoes.length === 0 ? <p className="p-5 text-gray-500">Nenhuma venda com promoção no período.</p> : (
          <table className={tabela}>
            <thead className={cabecalho}><tr><th scope="col" className="p-4">Promoção</th><th scope="col" className="p-4 text-right">Unidades vendidas</th><th scope="col" className="p-4 text-right">Faturamento</th></tr></thead>
            <tbody>{painel.promocoes.map((promocao) => (
              <tr key={promocao.id} className={linha}><td className="p-4 font-bold">{promocao.nome}</td><td className="p-4 text-right">{promocao.quantidade}</td><td className="p-4 text-right font-bold text-emerald-600">{formatarPreco(promocao.faturamento)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Secao>

      <Secao titulo="Dias de baixo movimento" descricao="Média de comandas finalizadas por dia da semana. Sinaliza dias com pelo menos 8 observações e média abaixo de 70% da média geral por dia aberto.">
        <p className="px-5 pt-4 text-sm text-gray-500">
          Média geral: {painel.movimento.media_geral_comandas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} comandas por dia aberto. Dias abertos sem venda contam como zero.
        </p>
        {painel.movimento.dias_baixo_movimento.length === 0 ? <p className="p-5 text-gray-500">Nenhum dia da semana atende aos critérios no período.</p> : (
          <table className={tabela}>
            <thead className={cabecalho}><tr>
              {['Dia da semana', 'Dias observados', 'Média de comandas', 'Média de faturamento'].map((titulo) => <th key={titulo} scope="col" className="p-4 whitespace-nowrap">{titulo}</th>)}
            </tr></thead>
            <tbody>{painel.movimento.dias_baixo_movimento.map((dia) => (
              <tr key={dia.dia_semana} className={linha}>
                <td className="p-4 font-bold capitalize">{dia.dia_semana}</td>
                <td className="p-4">{dia.dias_observados}</td>
                <td className="p-4">{dia.media_comandas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                <td className="p-4 font-bold text-emerald-600">{formatarPreco(dia.media_faturamento)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Secao>
    </div>
  );
}

export default function PainelGerente() {
  const [filtros, setFiltros] = useState(periodoInicial);
  const [aplicados, setAplicados] = useState(filtros);
  const consulta = new URLSearchParams(aplicados).toString();

  function filtrar(evento) {
    evento.preventDefault();
    setAplicados({ ...filtros });
  }

  return (
    <div className="relative pb-10">
      <h1 className="text-3xl font-bold text-header font-header mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-6">Indicadores por data de fechamento da comanda.</p>
      <form onSubmit={filtrar} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <label className="w-full text-sm font-bold text-header">Data inicial
          <input required type="date" value={filtros.data_inicio} max={filtros.data_fim} onChange={(evento) => setFiltros({ ...filtros, data_inicio: evento.target.value })} className="block mt-1 w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover" />
        </label>
        <label className="w-full text-sm font-bold text-header">Data final
          <input required type="date" value={filtros.data_fim} min={filtros.data_inicio} onChange={(evento) => setFiltros({ ...filtros, data_fim: evento.target.value })} className="block mt-1 w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover" />
        </label>
        <button type="submit" className="bg-hover hover:opacity-90 text-header px-6 py-2.5 rounded-md font-bold shadow-sm cursor-pointer w-full sm:w-auto">Filtrar</button>
      </form>
      <Indicadores key={consulta} consulta={consulta} />
    </div>
  );
}
