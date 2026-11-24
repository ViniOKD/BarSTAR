import { useState } from "react";
import { AvisoErro } from "./Avisos.jsx";
import { useDadosApi } from "../../hooks/useDadosApi.js";
import formatarPreco from "../../utils/formatarPreco.js";

const CORES = ["#373F47", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#84cc16"];

function percentual(valor, total) {
  if (!total) return "0%";
  return `${((valor / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function Resumo({ titulo, valor, destaque }) {
  return (
    <div className="bg-fundo rounded-lg p-4">
      <p className="text-sm text-gray-600">{titulo}</p>
      <p className={`text-2xl font-bold ${destaque ? "text-emerald-600" : "text-header"}`}>{valor}</p>
    </div>
  );
}

function GraficoHorarios({ horarios }) {
  const maximo = Math.max(1, ...horarios.map((horario) => horario.pedidos));
  const pico = horarios.reduce((maior, horario) => horario.pedidos > maior.pedidos ? horario : maior, horarios[0]);

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        Pico: {pico.pedidos ? `${String(pico.hora).padStart(2, "0")}h, com ${pico.pedidos} ${pico.pedidos === 1 ? "pedido" : "pedidos"}` : "nenhum pedido no período"}.
      </p>
      <div className="flex items-end gap-1 h-40" role="img" aria-label="Pedidos por hora do dia">
        {horarios.map((horario) => (
          <div key={horario.hora} className="flex-1 h-full flex items-end" title={`${String(horario.hora).padStart(2, "0")}h: ${horario.pedidos} ${horario.pedidos === 1 ? "pedido" : "pedidos"}`}>
            <div className="w-full bg-hover rounded-t" style={{ height: `${(horario.pedidos / maximo) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {horarios.map((horario) => (
          <span key={horario.hora} className="flex-1 text-center text-[10px] text-gray-500">
            {horario.hora % 3 === 0 ? `${horario.hora}h` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function GraficoCategorias({ categorias }) {
  const total = categorias.reduce((soma, categoria) => soma + categoria.quantidade, 0);
  if (!total) return <p className="text-gray-500">Nenhuma venda no período.</p>;

  const segmentos = categorias.map((categoria, indice) => {
    const inicio = categorias.slice(0, indice).reduce((soma, anterior) => soma + anterior.quantidade, 0);
    const fim = inicio + categoria.quantidade;
    return `${CORES[indice % CORES.length]} ${(inicio / total) * 100}% ${(fim / total) * 100}%`;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="w-40 h-40 rounded-full shrink-0"
        style={{ background: `conic-gradient(${segmentos.join(", ")})` }}
        role="img"
        aria-label="Participação das categorias nas unidades vendidas"
      />
      <ul className="w-full space-y-1">
        {categorias.map((categoria, indice) => (
          <li key={categoria.nome} className="flex items-center gap-2 text-sm text-header">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: CORES[indice % CORES.length] }} />
            <span className="font-bold flex-1">{categoria.nome}</span>
            <span>{categoria.quantidade}</span>
            <span className="text-gray-500 w-14 text-right">{percentual(categoria.quantidade, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RelatorioVendas({ dataInicio, dataFim }) {
  const [filtros, setFiltros] = useState({ categoria: "", garcom: "", promocao: "" });
  const [aplicados, setAplicados] = useState(filtros);
  const parametros = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });
  Object.entries(aplicados).forEach(([campo, valor]) => {
    if (valor) parametros.set(campo, valor);
  });
  const consulta = parametros.toString();

  const { dados, erro, carregando, recarregar } = useDadosApi([
    `/api/gerente/relatorio-vendas/?${consulta}`,
    "/api/categorias/",
    "/api/funcionarios/?cargo=GARCOM&ativo=true",
    "/api/promocoes/",
  ]);

  const [relatorio, categorias, garcons, promocoes] = dados;

  function filtrar(evento) {
    evento.preventDefault();
    setAplicados({ ...filtros });
  }

  const campo = "block mt-1 w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover";

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-header font-header">Relatório de vendas</h2>
          <p className="text-sm text-gray-500 mt-1">Itens vendidos, faturamento e horários de pico das comandas finalizadas no período.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href={`/api/gerente/relatorio-vendas/?${consulta}&formato=csv`} className="border border-header text-header px-4 py-2 rounded-md font-bold hover:bg-fundo">Exportar CSV</a>
          <a href={`/api/gerente/relatorio-vendas/?${consulta}&formato=pdf`} className="bg-header text-white px-4 py-2 rounded-md font-bold hover:opacity-90">Exportar PDF</a>
        </div>
      </div>

      <form onSubmit={filtrar} className="p-5 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <label className="text-sm font-bold text-header">Categoria
          <select value={filtros.categoria} onChange={(evento) => setFiltros({ ...filtros, categoria: evento.target.value })} className={campo}>
            <option value="">Todas</option>
            {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-header">Garçom
          <select value={filtros.garcom} onChange={(evento) => setFiltros({ ...filtros, garcom: evento.target.value })} className={campo}>
            <option value="">Todos</option>
            {garcons.map((garcom) => <option key={garcom.id} value={garcom.id}>{garcom.nome}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-header">Promoção
          <select value={filtros.promocao} onChange={(evento) => setFiltros({ ...filtros, promocao: evento.target.value })} className={campo}>
            <option value="">Todas</option>
            {promocoes.map((promocao) => <option key={promocao.id} value={promocao.id}>{promocao.nome}</option>)}
          </select>
        </label>
        <button type="submit" className="bg-hover hover:opacity-90 text-header px-6 py-2.5 rounded-md font-bold shadow-sm cursor-pointer">Aplicar filtros</button>
      </form>

      <div className="p-5 space-y-6">
        {carregando && <p role="status" className="text-header font-bold">Buscando relatório...</p>}
        {erro && (
          <div>
            <AvisoErro mensagem={erro} />
            <button onClick={recarregar} className="bg-hover text-header px-4 py-2 rounded-md font-bold cursor-pointer">Tentar novamente</button>
          </div>
        )}
        {!carregando && !erro && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Resumo titulo="Itens vendidos" valor={relatorio.total_itens.toLocaleString("pt-BR")} />
              <Resumo titulo="Faturamento" valor={formatarPreco(relatorio.faturamento)} destaque />
              <Resumo titulo="Comandas finalizadas" valor={relatorio.total_comandas.toLocaleString("pt-BR")} />
              <Resumo titulo="Média por comanda" valor={formatarPreco(relatorio.media_por_comanda)} destaque />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-header mb-1">Pedidos por hora</h3>
                <p className="text-sm text-gray-500 mb-3">Pedidos distintos pela hora de envio, contando apenas os itens que atendem aos filtros.</p>
                <GraficoHorarios horarios={relatorio.horarios} />
              </div>
              <div>
                <h3 className="font-bold text-header mb-1">Categorias mais vendidas</h3>
                <p className="text-sm text-gray-500 mb-3">Participação das categorias nas unidades vendidas.</p>
                <GraficoCategorias categorias={relatorio.categorias} />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-header mb-3">Produtos mais vendidos</h3>
              {relatorio.produtos.length === 0 ? <p className="text-gray-500">Nenhum produto vendido no período.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-header">
                    <thead className="bg-gray-50 border-b border-gray-200 text-sm">
                      <tr><th scope="col" className="p-4">Produto</th><th scope="col" className="p-4 text-right">Unidades vendidas</th></tr>
                    </thead>
                    <tbody>{relatorio.produtos.map((produto) => (
                      <tr key={produto.id} className="border-b border-gray-100 last:border-0 hover:bg-fundo">
                        <td className="p-4 font-bold">{produto.nome}</td>
                        <td className="p-4 text-right">{produto.quantidade}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
