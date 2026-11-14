import { useState } from "react";
import { AvisoErro } from "../../components/gerente/Avisos.jsx";
import { IconeVer } from "../../components/gerente/Icones.jsx";
import Modal from "../../components/gerente/Modal.jsx";
import { useDadosApi } from "../../hooks/useDadosApi.js";
import formatarPreco from "../../utils/formatarPreco.js";

const FILTROS_VAZIOS = { dataInicio: "", dataFim: "", mesa: "", garcom: "" };

const campoFiltro = "w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover text-header bg-white";

function formatarData(dataIso) {
  if (!dataIso) return "-";
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

function formatarHora(dataIso) {
  if (!dataIso) return "";
  return new Date(dataIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Monta o endereço da busca com os filtros preenchidos.
function urlDoHistorico(filtros) {
  const parametros = new URLSearchParams();

  if (filtros.dataInicio) parametros.append("data_inicio", filtros.dataInicio);
  if (filtros.dataFim) parametros.append("data_fim", filtros.dataFim);
  if (filtros.mesa) parametros.append("mesa", filtros.mesa);
  if (filtros.garcom) parametros.append("garcom", filtros.garcom);

  return `/api/historico/comandas/?${parametros.toString()}`;
}

function CampoFiltro({ rotulo, ...propriedades }) {
  return (
    <label className="flex-1 w-full block text-sm font-bold text-header">
      {rotulo}
      <input className={`${campoFiltro} mt-1 font-normal`} {...propriedades} />
    </label>
  );
}

function BarraFiltros({ filtros, onMudar, onFiltrar, onLimpar }) {
  function mudar(evento) {
    onMudar({ ...filtros, [evento.target.name]: evento.target.value });
  }

  function enviar(evento) {
    evento.preventDefault();
    onFiltrar();
  }

  return (
    <form onSubmit={enviar} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col lg:flex-row gap-4 items-end">
      <CampoFiltro rotulo="Data Início" type="date" name="dataInicio" value={filtros.dataInicio} onChange={mudar} />
      <CampoFiltro rotulo="Data Fim" type="date" name="dataFim" value={filtros.dataFim} onChange={mudar} />
      <CampoFiltro rotulo="Número da Mesa" type="number" min="1" name="mesa" placeholder="Ex: 5" value={filtros.mesa} onChange={mudar} />
      <CampoFiltro rotulo="Nome do Garçom" type="text" name="garcom" placeholder="Ex: João" value={filtros.garcom} onChange={mudar} />

      <div className="flex gap-2 w-full lg:w-auto">
        <button
          type="button"
          onClick={onLimpar}
          className="bg-white hover:bg-gray-100 border border-gray-300 text-header px-4 py-2.5 rounded-md font-bold transition-colors cursor-pointer w-full lg:w-auto"
        >
          Limpar
        </button>
        <button
          type="submit"
          className="bg-hover hover:opacity-90 text-header px-6 py-2.5 rounded-md font-bold shadow-sm transition-opacity cursor-pointer w-full lg:w-auto"
        >
          Filtrar
        </button>
      </div>
    </form>
  );
}

function LinhaComanda({ comanda, onVer }) {
  return (
    <tr className="hover:bg-fundo transition-colors border-b border-gray-100 last:border-0 bg-white">
      <td className="p-4 font-bold text-header">{comanda.id}</td>
      <td className="p-4 text-header">
        {formatarData(comanda.data_fechamento)} {formatarHora(comanda.data_fechamento)}
      </td>
      <td className="p-4 text-header">{comanda.mesa_numero}</td>
      <td className="p-4 text-header">{comanda.garcom_nome || "Não registrado"}</td>
      <td className="p-4 font-bold text-emerald-600">{formatarPreco(comanda.total)}</td>
      <td className="p-4 text-center">
        <button onClick={() => onVer(comanda)} className="text-gray-400 hover:text-hover transition-colors cursor-pointer" title="Ver Detalhes">
          <IconeVer />
        </button>
      </td>
    </tr>
  );
}

function Informacao({ rotulo, children }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-1">{rotulo}</p>
      <div className="font-bold text-header">{children}</div>
    </div>
  );
}

function DataEHora({ dataIso }) {
  if (!dataIso) return "-";

  return (
    <>
      <div>{formatarData(dataIso)}</div>
      <div className="text-sm text-gray-600">{formatarHora(dataIso)}</div>
    </>
  );
}

function LinhaItem({ item }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-fundo transition-colors">
      <td className="px-4 py-3 font-semibold">
        {item.nome}
        {item.nome_promocao_registrada && (
          <span className="block text-xs text-hover font-bold mt-0.5">Promoção: {item.nome_promocao_registrada}</span>
        )}
      </td>
      <td className="px-4 py-3 text-center font-medium">{item.quantidade}</td>
      <td className="px-4 py-3 text-right font-medium">{formatarPreco(item.preco_unitario)}</td>
      <td className="px-4 py-3 text-right font-bold">{formatarPreco(item.subtotal)}</td>
    </tr>
  );
}

function DetalhesComanda({ comanda, onFechar }) {
  // Junta os itens de todos os pedidos da comanda em uma lista só.
  const itens = comanda.pedidos.flatMap((pedido) => pedido.itens);

  return (
    <Modal titulo={`Detalhes da Comanda ${comanda.id}`} largura="max-w-3xl" onFechar={onFechar}>
      <div className="mb-8 flex flex-wrap gap-x-12 gap-y-4">
        <Informacao rotulo="Mesa">{comanda.mesa_numero}</Informacao>
        <Informacao rotulo="Garçom">{comanda.garcom_nome || "Não registrado"}</Informacao>
        <Informacao rotulo="Abertura"><DataEHora dataIso={comanda.data_abertura} /></Informacao>
        <Informacao rotulo="Fechamento"><DataEHora dataIso={comanda.data_fechamento} /></Informacao>
      </div>

      <h3 className="mb-3 font-bold text-header">Itens Consumidos</h3>
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-header">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-center">Qtd</th>
              <th className="px-4 py-3 text-right">Preço unit.</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan="4" className="px-4 py-4 text-center text-gray-500 font-medium">Nenhum item registrado.</td>
              </tr>
            )}
            {itens.map((item) => (
              <LinhaItem key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-header font-header">
          Total da Comanda: <span className="text-2xl text-emerald-600">{formatarPreco(comanda.total)}</span>
        </p>
        <button
          onClick={onFechar}
          className="rounded-lg bg-hover px-6 py-2.5 font-bold text-header transition-opacity hover:opacity-90 shadow-sm cursor-pointer"
        >
          Fechar Detalhes
        </button>
      </div>
    </Modal>
  );
}

export default function Historico() {
  // O que está digitado nos campos e o que já foi aplicado na busca.
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_VAZIOS);
  const [comandaSelecionada, setComandaSelecionada] = useState(null);

  const { dados, erro, carregando } = useDadosApi([urlDoHistorico(filtrosAplicados)]);
  const [comandas] = dados;

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS);
    setFiltrosAplicados(FILTROS_VAZIOS);
  }

  if (carregando) return <p className="text-header font-bold p-4">Buscando histórico no servidor...</p>;

  return (
    <div className="relative pb-10">
      <h1 className="text-3xl font-bold text-header font-header mb-6">Histórico de Comandas</h1>

      <AvisoErro mensagem={erro} />

      <BarraFiltros
        filtros={filtros}
        onMudar={setFiltros}
        onFiltrar={() => setFiltrosAplicados(filtros)}
        onLimpar={limparFiltros}
      />

      <div className="bg-destaque rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-white">
              <th className="p-4 text-header font-bold">Comanda ID</th>
              <th className="p-4 text-header font-bold">Fechamento</th>
              <th className="p-4 text-header font-bold">Mesa</th>
              <th className="p-4 text-header font-bold">Garçom</th>
              <th className="p-4 text-header font-bold">Total</th>
              <th className="p-4 text-header font-bold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {comandas.length === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-header">Nenhuma comanda encontrada para estes filtros.</td>
              </tr>
            )}
            {comandas.map((comanda) => (
              <LinhaComanda key={comanda.id} comanda={comanda} onVer={setComandaSelecionada} />
            ))}
          </tbody>
        </table>
      </div>

      {comandaSelecionada && (
        <DetalhesComanda comanda={comandaSelecionada} onFechar={() => setComandaSelecionada(null)} />
      )}
    </div>
  );
}
