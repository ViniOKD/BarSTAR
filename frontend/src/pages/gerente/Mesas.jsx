import { useState, useEffect } from "react";

// Função nativa para capturar o token CSRF dos cookies do navegador
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export default function Mesas() {
  const [mesas, setMesas] = useState([]);
  const [garcons, setGarcons] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState(null);

  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroExclusao, setErroExclusao] = useState("");
  const [mesaParaExcluir, setMesaParaExcluir] = useState(null);

  // Controle do Modal e Edição
  const [modalMesaAberto, setModalMesaAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [erroFormulario, setErroFormulario] = useState("");

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroGarcomNome, setFiltroGarcomNome] = useState(""); 

  const estadoInicialMesa = {
    capacidade: 4,
    status: "LIVRE",
    garcom_id: ""
  };

  const [formDataMesa, setFormDataMesa] = useState(estadoInicialMesa);

  // Reserva de Mesas
  const [modalReservaAberto, setModalReservaAberto] = useState(false);
  const [mesaParaReservar, setMesaParaReservar] = useState(null);
  const [formDataReserva, setFormDataReserva] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    data_reserva: "",
    hora_reserva: ""
  });

  const buscarDados = async () => {
    try {
      setErroApi(null);
      const [respostaMesas, respostaGarcons] = await Promise.all([
        fetch("/api/mesas/"),
        fetch("/api/garcons/")
      ]);

      if (respostaMesas.ok && respostaGarcons.ok) {
        const dadosMesas = await respostaMesas.json();
        const dadosGarcons = await respostaGarcons.json();

        setMesas(dadosMesas.results ? dadosMesas.results : dadosMesas);
        setGarcons(dadosGarcons.results ? dadosGarcons.results : dadosGarcons);
      } else {
        let erros = [];
        if (!respostaMesas.ok) erros.push(`Mesas (${respostaMesas.status})`);
        if (!respostaGarcons.ok) erros.push(`Garçons (${respostaGarcons.status})`);

        setErroApi(`Erro no servidor ao carregar: ${erros.join(" e ")}.`);
      }
    } catch (erro) {
      setErroApi("Erro de Conexão. O React não conseguiu alcançar o Django.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDados();
  }, []);

  const mostrarSucesso = (mensagem) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => {
      setMensagemSucesso("");
    }, 3000);
  };

  const handleChangeMesa = (e) => {
    const { name, value } = e.target;

    // REGRA DE REDIRECIONAMENTO:
    // Se o gerente tentar alterar o status para RESERVADA pelo modal de edição comum,
    // fechamos o modal de edição e abrimos o modal específico de Reserva!
    if (name === "status" && value === "RESERVADA") {
      const mesaAtual = mesas.find((m) => m.id === editandoId) || { id: editandoId, capacidade: formDataMesa.capacidade };
      setModalMesaAberto(false);
      abrirModalReserva(mesaAtual);
      return;
    }

    setFormDataMesa({
      ...formDataMesa,
      [name]: value
    });
  };

  const abrirModalNovo = () => {
    setEditandoId(null);
    setFormDataMesa(estadoInicialMesa);
    setErroFormulario("");
    setModalMesaAberto(true);
  };

  const abrirModalEdicao = (mesa) => {
    setEditandoId(mesa.id);
    setFormDataMesa({
      capacidade: mesa.capacidade,
      status: mesa.status,
      garcom_id: mesa.garcom?.id || mesa.garcom_id || ""
    });
    setErroFormulario("");
    setModalMesaAberto(true);
  };

  // Funções do Modal de Reserva
  const abrirModalReserva = (mesa) => {
    setMesaParaReservar(mesa);
    setErroFormulario("");
    setFormDataReserva({
      cliente_nome: "",
      cliente_telefone: "",
      data_reserva: new Date().toISOString().split("T")[0],
      hora_reserva: "19:00"
    });
    setModalReservaAberto(true);
  };

  const handleChangeReserva = (e) => {
    const { name, value } = e.target;
    setFormDataReserva({
      ...formDataReserva,
      [name]: value
    });
  };

  const handleSubmitReserva = async (e) => {
    e.preventDefault();
    setErroFormulario("");

    if (!formDataReserva.cliente_nome) {
      setErroFormulario("Informe o nome do cliente.");
      return;
    }

    const csrftoken = getCookie("csrftoken");

    try {
      const resposta = await fetch(`/api/mesas/${mesaParaReservar.id}/reservar/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(formDataReserva)
      });

      if (resposta.ok) {
        mostrarSucesso(`Mesa #${mesaParaReservar.id} reservada para ${formDataReserva.cliente_nome}!`);
        setModalReservaAberto(false);
        buscarDados();
      } else {
        const erros = await resposta.json().catch(() => ({}));
        setErroFormulario(erros.erro || erros.detail || "Erro ao efetuar a reserva.");
      }
    } catch (erro) {
      setErroFormulario("Erro de conexão ao tentar reservar.");
    }
  };

  const handleSubmitMesa = async (e) => {
    e.preventDefault();
    setErroFormulario("");

    if (!formDataMesa.capacidade || Number(formDataMesa.capacidade) < 1) {
      setErroFormulario("A capacidade deve ser de no mínimo 01 pessoa.");
      return;
    }

    if (!formDataMesa.garcom_id) {
      setErroFormulario("Selecione um garçom responsável pela mesa.");
      return;
    }

    const idGerenteLogado = localStorage.getItem("gerente_id") || localStorage.getItem("usuario_id");

    if (!idGerenteLogado) {
      setErroFormulario("Erro: Identificação do gerente não encontrada. Faça login novamente.");
      return;
    }

    const payload = {
      capacidade: Number(formDataMesa.capacidade),
      status: formDataMesa.status,
      garcom_id: Number(formDataMesa.garcom_id),
      garcom: Number(formDataMesa.garcom_id), 
      gerente_id: Number(idGerenteLogado), 
      gerente: Number(idGerenteLogado)
    };

    const csrftoken = getCookie("csrftoken");

    try {
      const metodo = editandoId ? "PUT" : "POST";
      const url = editandoId ? `/api/mesas/${editandoId}/` : "/api/mesas/";

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(payload)
      });

      if (resposta.ok) {
        mostrarSucesso(editandoId ? "Mesa atualizada com sucesso!" : "Mesa cadastrada com sucesso!");
        setModalMesaAberto(false);
        buscarDados();
      } else {
        const erros = await resposta.json().catch(() => ({}));
        
        let mensagemFormatada = "Erro ao salvar a mesa. Verifique os dados.";
        if (erros.erro) {
          mensagemFormatada = erros.erro;
        } else if (Object.keys(erros).length > 0) {
          mensagemFormatada = Object.entries(erros)
            .map(([campo, msgs]) => `${campo.toUpperCase()}: ${msgs}`)
            .join(" | ");
        }
        
        setErroFormulario(mensagemFormatada);
      }
    } catch (erro) {
      setErroFormulario("Erro de conexão ao tentar salvar.");
    }
  };

  const confirmarExclusao = (mesa) => {
    setErroExclusao("");
    setMesaParaExcluir(mesa);
  };

  const executarExclusao = async () => {
    if (!mesaParaExcluir) return;
    setErroExclusao("");

    const csrftoken = getCookie("csrftoken");

    try {
      const resposta = await fetch(`/api/mesas/${mesaParaExcluir.id}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrftoken
        }
      });

      if (resposta.ok) {
        mostrarSucesso("Mesa removida com sucesso!");
        setMesaParaExcluir(null);
        buscarDados();
      } else {
        const erroJson = await resposta.json().catch(() => null);

        if (erroJson && erroJson.erro) {
          setErroExclusao(erroJson.erro);
        } else if (erroJson && erroJson.detail) {
          setErroExclusao(erroJson.detail);
        } else if (resposta.status === 500) {
          setErroExclusao(
            "Erro 500 (Servidor): Ocorreu um erro interno no servidor ao tentar excluir."
          );
        } else {
          setErroExclusao(`Erro ${resposta.status}: Ocorreu um problema ao tentar excluir.`);
        }
      }
    } catch (erro) {
      setErroExclusao("Erro de conexão ao tentar excluir a mesa.");
    }
  };

  const mesasFiltradas = mesas.filter((mesa) => {
    const matchStatus = filtroStatus === "todos" || mesa.status === filtroStatus;
    const nomeGarcom = mesa.garcom?.nome || "";
    const matchGarcom = nomeGarcom.toLowerCase().includes(filtroGarcomNome.toLowerCase());

    return matchStatus && matchGarcom;
  });

  // BADGES QUADRADAS E ARREDONDADAS IGUAL AS CATEGORIAS
  const getEstiloStatus = (status) => {
    const base = "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide inline-block";
    switch (status) {
      case "LIVRE": return `${base} bg-emerald-100 text-emerald-700`;
      case "OCUPADA": return `${base} bg-red-100 text-red-700`;
      case "RESERVADA": return `${base} bg-blue-100 text-blue-700`;
      case "INATIVA": return `${base} bg-gray-200 text-gray-700`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  };

  if (carregando) {
    return <p className="text-header font-bold p-4">Carregando mesas do banco de dados...</p>;
  }

  return (
    <div className="relative pb-10">
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-header font-header">
          Gestão de Mesas
        </h1>
        <button
          onClick={abrirModalNovo}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-bold shadow-sm transition-colors cursor-pointer"
        >
          + Nova Mesa
        </button>
      </div>

      {/* AVISO DE ERRO DE CONEXÃO COM API */}
      {erroApi && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p className="font-bold">Aviso de Comunicação API:</p>
          <p>{erroApi}</p>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-3 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome do garçom..."
            value={filtroGarcomNome}
            onChange={(e) => setFiltroGarcomNome(e.target.value)}
            className="w-full border border-gray-300 py-2.5 pl-10 pr-4 rounded-md focus:outline-none focus:border-hover text-gray-700 bg-white"
          />
        </div>
        
        <div className="md:w-64 w-full">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover text-gray-700 bg-white"
          >
            <option value="todos">Todos os Status</option>
            <option value="LIVRE">Livre</option>
            <option value="OCUPADA">Ocupada</option>
            <option value="RESERVADA">Reservada</option>
            <option value="INATIVA">Inativa</option>
          </select>
        </div>
      </div>

      {/* TABELA DE MESAS COM HOVER AMARELINHO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm">
                <th className="p-4 font-bold text-gray-800">Mesa</th>
                <th className="p-4 font-bold text-gray-800">Capacidade</th>
                <th className="p-4 font-bold text-gray-800">Garçom</th>
                <th className="p-4 font-bold text-gray-800">Status</th>
                <th className="p-4 font-bold text-gray-800 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mesasFiltradas.length > 0 ? (
                mesasFiltradas.map((mesa) => (
                  <tr key={mesa.id} className="border-b border-gray-100 hover:bg-[#FFF9E6] transition-colors">
                    <td className="p-4 font-bold text-header">#{mesa.id}</td>
                    <td className="p-4 text-gray-600">{mesa.capacidade} lugares</td>
                    <td className="p-4 text-gray-600">{mesa.garcom?.nome || "-"}</td>
                    <td className="p-4">
                      <span className={`${getEstiloStatus(mesa.status)}`}>
                        {mesa.status}
                      </span>
                    </td>
                    <td className="p-4 flex justify-center gap-3">
                      {/* BOTÃO RESERVAR (Disponível para mesas Livres) */}
                      {mesa.status === "LIVRE" && (
                        <button
                          onClick={() => abrirModalReserva(mesa)}
                          className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Reservar Mesa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                        </button>
                      )}

                      {/* BOTÃO EDITAR */}
                      <button 
                        onClick={() => abrirModalEdicao(mesa)}
                        className="text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </button>

                      {/* BOTÃO EXCLUIR */}
                      <button 
                        onClick={() => confirmarExclusao(mesa)}
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    Nenhuma mesa encontrada com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-gray-500 text-sm">
        Total de mesas encontradas: <strong>{mesasFiltradas.length}</strong>
      </p>

      {/* TOAST DE SUCESSO */}
      {mensagemSucesso && (
        <div className="fixed bottom-6 right-6 bg-header text-white px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-2 z-50 border-l-4 border-hover transition-opacity duration-300">
          {mensagemSucesso}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {mesaParaExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque p-8 rounded-xl w-full max-w-md shadow-2xl text-center border-t-4 border-red-500">
            <h3 className="text-2xl font-bold text-header mb-3 font-header">Remover Mesa?</h3>
            <p className="text-header/80 mb-6">
              Tem certeza que deseja remover a <strong>Mesa #{mesaParaExcluir.id}</strong>?
            </p>
            
            {erroExclusao && (
              <div className="mb-6 rounded-md bg-red-100 border border-red-200 p-3 text-sm text-red-700 font-medium">
                {erroExclusao}
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setMesaParaExcluir(null)}
                className="bg-white text-header px-6 py-2.5 rounded-md font-bold hover:bg-gray-50 border border-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executarExclusao}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-bold transition-colors cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAR / EDITAR MESA */}
      {modalMesaAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque rounded-2xl w-full max-w-md shadow-2xl relative p-6">
            <button
              onClick={() => setModalMesaAberto(false)}
              className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl cursor-pointer"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-6 text-header font-header">
              {editandoId ? `Editar Mesa #${editandoId}` : "Nova Mesa"}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md bg-red-100 border border-red-200 p-3 text-sm text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={handleSubmitMesa} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-header">Capacidade (Lugares)</label>
                <input
                  required
                  type="number"
                  min="1"
                  name="capacidade"
                  value={formDataMesa.capacidade}
                  onChange={handleChangeMesa}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-header">Garçom Responsável</label>
                <select
                  required
                  name="garcom_id"
                  value={formDataMesa.garcom_id}
                  onChange={handleChangeMesa}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                >
                  <option value="">Selecione o garçom...</option>
                  {garcons.map((garcom) => (
                    <option key={garcom.id} value={garcom.id}>
                      {garcom.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-header">Status Inicial</label>
                <select
                  name="status"
                  value={formDataMesa.status}
                  onChange={handleChangeMesa}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                >
                  <option value="LIVRE">Livre</option>
                  <option value="OCUPADA">Ocupada</option>
                  <option value="RESERVADA">Reservada (Redireciona para Reserva)</option>
                  <option value="INATIVA">Inativa</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-header/10">
                <button
                  type="button"
                  onClick={() => setModalMesaAberto(false)}
                  className="bg-white text-header px-5 py-2.5 rounded-md font-bold border border-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-hover text-header px-5 py-2.5 rounded-md font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                >
                  {editandoId ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RESERVAR MESA */}
      {modalReservaAberto && mesaParaReservar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque rounded-2xl w-full max-w-md shadow-2xl relative p-6">
            <button
              onClick={() => setModalReservaAberto(false)}
              className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl cursor-pointer"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-2 text-header font-header">
              Reservar Mesa #{mesaParaReservar.id}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Capacidade da Mesa: <strong>{mesaParaReservar.capacidade} lugares</strong>
            </p>

            {erroFormulario && (
              <div className="mb-4 rounded-md bg-red-100 border border-red-200 p-3 text-sm text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={handleSubmitReserva} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-header">Nome do Cliente</label>
                <input
                  required
                  type="text"
                  name="cliente_nome"
                  placeholder="Ex: Maria Silva"
                  value={formDataReserva.cliente_nome}
                  onChange={handleChangeReserva}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-header">Telefone / WhatsApp</label>
                <input
                  type="text"
                  name="cliente_telefone"
                  placeholder="(00) 00000-0000"
                  value={formDataReserva.cliente_telefone}
                  onChange={handleChangeReserva}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-header">Data</label>
                  <input
                    required
                    type="date"
                    name="data_reserva"
                    value={formDataReserva.data_reserva}
                    onChange={handleChangeReserva}
                    className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-header">Horário</label>
                  <input
                    required
                    type="time"
                    name="hora_reserva"
                    value={formDataReserva.hora_reserva}
                    onChange={handleChangeReserva}
                    className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-header/10">
                <button
                  type="button"
                  onClick={() => setModalReservaAberto(false)}
                  className="bg-white text-header px-5 py-2.5 rounded-md font-bold border border-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}