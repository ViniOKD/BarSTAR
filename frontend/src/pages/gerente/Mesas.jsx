import { useState, useEffect } from "react";

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

  // Controle do Modal de Mesa (Criar / Editar)
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

  // Agenda / Reserva de Mesas
  const [modalReservaAberto, setModalReservaAberto] = useState(false);
  const [mesaParaReservar, setMesaParaReservar] = useState(null);
  const [reservaParaCancelar, setReservaParaCancelar] = useState(null);
  const [editandoReservaId, setEditandoReservaId] = useState(null);
  const [erroCancelamentoReserva, setErroCancelamentoReserva] = useState("");
  const [carregandoCancelamento, setCarregandoCancelamento] = useState(false);

  const [formDataReserva, setFormDataReserva] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    data_reserva: "",
    hora_reserva: "",
    mesas_agrupadas_ids: []
  });

  // Juntar / Separar Mesas
  const [modalJuntarAberto, setModalJuntarAberto] = useState(false);
  const [mesaPrincipalParaJuntar, setMesaPrincipalParaJuntar] = useState(null);
  const [mesasSelecionadasParaJuntar, setMesasSelecionadasParaJuntar] = useState([]);
  const [erroJuntar, setErroJuntar] = useState("");
  const [carregandoJuntar, setCarregandoJuntar] = useState(false);

  // Confirmação para Separar
  const [modalSepararAberto, setModalSepararAberto] = useState(false);
  const [mesaParaSeparar, setMesaParaSeparar] = useState(null);

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

        const listaMesas = dadosMesas.results ? dadosMesas.results : dadosMesas;
        const listaGarcons = dadosGarcons.results ? dadosGarcons.results : dadosGarcons;

        setMesas(listaMesas);
        setGarcons(listaGarcons);

        if (mesaParaReservar) {
          const mesaAtualizada = listaMesas.find((m) => m.id === mesaParaReservar.id);
          if (mesaAtualizada) {
            setMesaParaReservar(mesaAtualizada);
          }
        }
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

  const abrirModalReserva = (mesa) => {
    if (!mesa || !mesa.id) {
      setErroFormulario("Crie a mesa primeiro antes de efetuar uma reserva.");
      return;
    }
    
    if (mesa.status === "INATIVA") {
      setErroFormulario(`A Mesa ${mesa.id} está INATIVA. Ative a mesa antes de efetuar reservas.`);
      return;
    }

    setMesaParaReservar(mesa);
    setErroFormulario("");
    limparFormularioReserva();
    setModalReservaAberto(true);
  };

  const limparFormularioReserva = () => {
    setEditandoReservaId(null);
    setFormDataReserva({
      cliente_nome: "",
      cliente_telefone: "",
      data_reserva: new Date().toISOString().split("T")[0],
      hora_reserva: "19:00",
      mesas_agrupadas_ids: []
    });
  };

  const selecionarReservaParaEdicao = (reserva) => {
    setEditandoReservaId(reserva.id);
    setFormDataReserva({
      cliente_nome: reserva.cliente_nome || "",
      cliente_telefone: reserva.cliente_telefone || "",
      data_reserva: reserva.data_reserva || "",
      hora_reserva: reserva.hora_reserva || "",
      mesas_agrupadas_ids: reserva.mesas_agrupadas_ids || []
    });
    setErroFormulario("");
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
      const url = editandoReservaId 
        ? `/api/reservas/${editandoReservaId}/` 
        : `/api/mesas/${mesaParaReservar.id}/reservar/`;
        
      const metodo = editandoReservaId ? "PUT" : "POST";

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(formDataReserva)
      });

      if (resposta.ok) {
        mostrarSucesso(editandoReservaId ? "Reserva atualizada!" : `Reserva agendada para ${formDataReserva.cliente_nome}!`);
        limparFormularioReserva();
        buscarDados();
      } else {
        const erros = await resposta.json().catch(() => ({}));
        setErroFormulario(erros.erro || erros.detail || "Erro ao efetuar a reserva.");
      }
    } catch (erro) {
      setErroFormulario("Erro de conexão ao tentar reservar.");
    }
  };

  const solicitarCancelamentoReserva = (reserva, e) => {
    e.stopPropagation(); 
    setErroCancelamentoReserva("");
    setReservaParaCancelar(reserva);
  };

  const confirmarCancelamentoReserva = async () => {
    if (!reservaParaCancelar || carregandoCancelamento) return;
    
    const idParaDeletar = reservaParaCancelar.id;
    if (!idParaDeletar) {
      setErroCancelamentoReserva("ID da reserva é inválido.");
      return;
    }

    setCarregandoCancelamento(true);
    setErroCancelamentoReserva("");
    const csrftoken = getCookie("csrftoken");

    try {
      const resposta = await fetch(`/api/reservas/${idParaDeletar}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrftoken
        }
      });

      if (resposta.ok || resposta.status === 204) {
        mostrarSucesso("Reserva cancelada com sucesso!");
        
        if (editandoReservaId === idParaDeletar) {
          limparFormularioReserva();
        }

        setMesaParaReservar(prevMesa => ({
          ...prevMesa,
          reservas: prevMesa.reservas.filter(res => res.id !== idParaDeletar)
        }));

        setMesas(prevMesas => prevMesas.map(mesa => {
          if (mesa.id === mesaParaReservar.id) {
            return {
              ...mesa,
              reservas: mesa.reservas.filter(res => res.id !== idParaDeletar)
            };
          }
          return mesa;
        }));

        setReservaParaCancelar(null);
        buscarDados();
      } else {
        const erroJson = await resposta.json().catch(() => ({}));
        setErroCancelamentoReserva(erroJson.erro || erroJson.detail || "Erro ao cancelar no servidor.");
      }
    } catch (erro) {
      setErroCancelamentoReserva("Erro de conexão ao tentar cancelar a reserva.");
    } finally {
      setCarregandoCancelamento(false);
    }
  };

  // --- LÓGICA DE JUNTAR E SEPARAR MESAS ---
  const abrirModalJuntar = (mesaPrincipal) => {
    setMesaPrincipalParaJuntar(mesaPrincipal);
    setMesasSelecionadasParaJuntar([]);
    setErroJuntar("");
    setModalJuntarAberto(true);
  };

  const toggleSelecaoMesaJuntar = (idMesa) => {
    if (mesasSelecionadasParaJuntar.includes(idMesa)) {
      setMesasSelecionadasParaJuntar(mesasSelecionadasParaJuntar.filter(id => id !== idMesa));
    } else {
      setMesasSelecionadasParaJuntar([...mesasSelecionadasParaJuntar, idMesa]);
    }
  };

  const handleSubmitJuntar = async (e) => {
    e.preventDefault();
    if (!mesaPrincipalParaJuntar || mesasSelecionadasParaJuntar.length === 0) {
      setErroJuntar("Selecione pelo menos uma mesa para agrupar.");
      return;
    }

    setCarregandoJuntar(true);
    setErroJuntar("");
    const csrftoken = getCookie("csrftoken");

    try {
      const resposta = await fetch(`/api/mesas/${mesaPrincipalParaJuntar.id}/juntar/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({ mesas_ids: mesasSelecionadasParaJuntar })
      });

      if (resposta.ok) {
        mostrarSucesso(`Mesas agrupadas à Mesa ${mesaPrincipalParaJuntar.id} com sucesso!`);
        setModalJuntarAberto(false);
        buscarDados();
      } else {
        const erroJson = await resposta.json().catch(() => ({}));
        setErroJuntar(erroJson.erro || erroJson.detail || "Erro ao juntar mesas.");
      }
    } catch (erro) {
      setErroJuntar("Erro de conexão ao tentar juntar mesas.");
    } finally {
      setCarregandoJuntar(false);
    }
  };

  const confirmarSeparar = (mesaPrincipal) => {
    setMesaParaSeparar(mesaPrincipal);
    setModalSepararAberto(true);
  };

  const executarSepararMesas = async () => {
    if (!mesaParaSeparar) return;

    const csrftoken = getCookie("csrftoken");
    try {
      const resposta = await fetch(`/api/mesas/${mesaParaSeparar.id}/separar/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken
        }
      });

      if (resposta.ok) {
        mostrarSucesso(`Mesas desagrupadas da Mesa ${mesaParaSeparar.id} com sucesso!`);
        setModalSepararAberto(false);
        setMesaParaSeparar(null);
        buscarDados();
      } else {
        const erroJson = await resposta.json().catch(() => ({}));
        alert(erroJson.erro || erroJson.detail || "Erro ao desagrupar mesas.");
      }
    } catch (erro) {
      alert("Erro de conexão ao tentar separar mesas.");
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
          setErroExclusao("Erro 500: Ocorreu um erro interno no servidor ao tentar excluir.");
        } else {
          setErroExclusao(`Erro ${resposta.status}: Ocorreu um problema ao tentar excluir.`);
        }
      }
    } catch (erro) {
      setErroExclusao("Erro de conexão ao tentar excluir a mesa.");
    }
  };

  const mesasFiltradas = mesas.filter((mesa) => {
    const statusReal = mesa.status_dinamico || mesa.status;
    const matchStatus = filtroStatus === "todos" || statusReal === filtroStatus;
    const nomeGarcom = mesa.garcom?.nome || "";
    const matchGarcom = nomeGarcom.toLowerCase().includes(filtroGarcomNome.toLowerCase());

    return matchStatus && matchGarcom;
  });

  const getEstiloStatus = (status) => {
    const base = "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide inline-block";
    switch (status) {
      case "LIVRE": return `${base} bg-emerald-100 text-emerald-700`;
      case "OCUPADA": return `${base} bg-red-100 text-red-700`;
      case "RESERVADA": return `${base} bg-yellow-100 text-yellow-700`;
      case "INATIVA": return `${base} bg-gray-200 text-gray-700`;
      case "AGRUPADA": return `${base} bg-yellow-100 text-yellow-700 border border-yellow-300`;
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

      {erroApi && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p className="font-bold">Aviso de Comunicação API:</p>
          <p>{erroApi}</p>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-3 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
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
            <option value="AGRUPADA">Agrupada</option>
            <option value="INATIVA">Inativa</option>
          </select>
        </div>
      </div>

      {/* TABELA DE MESAS */}
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
                mesasFiltradas.map((mesa) => {
                  const statusExibicao = mesa.status_dinamico || mesa.status;
                  const capacidadeExibicao = mesa.capacidade_total || mesa.capacidade;
                  return (
                    <tr key={mesa.id} className="border-b border-gray-100 hover:bg-[#FFF9E6] transition-colors">
                      <td className="p-4 font-bold text-header">
                        {mesa.id}
                        {mesa.is_principal && (
                          <span className="ml-2 text-xs bg-yellow-500 text-white font-bold px-2 py-0.5 rounded-full">
                            Principal
                          </span>
                        )}
                        {mesa.mesa_agrupada && (
                          <span className="ml-2 text-xs text-yellow-700 font-normal">
                            (Mesa Agrupada à {mesa.mesa_agrupada})
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {capacidadeExibicao} lugares
                        {mesa.is_principal && (
                          <span className="block text-xs text-yellow-600 font-semibold">
                            (Soma com agrupadas)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600">{mesa.garcom?.nome || "-"}</td>
                      <td className="p-4">
                        <span className={`${getEstiloStatus(statusExibicao)}`}>
                          {statusExibicao}
                        </span>
                      </td>
                      <td className="p-4 flex justify-center gap-3 items-center">
                        {/* Ícone Juntar Mesas */}
                        {statusExibicao === "LIVRE" && (
                          <button
                            onClick={() => abrirModalJuntar(mesa)}
                            className="text-gray-400 hover:text-yellow-600 transition-colors cursor-pointer"
                            title="Juntar Mesas"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                          </button>
                        )}

                        {/* Ícone Separar Mesas */}
                        {mesa.is_principal && (
                          <button
                            onClick={() => confirmarSeparar(mesa)}
                            className="text-gray-400 hover:text-yellow-600 transition-colors cursor-pointer"
                            title="Desagrupar Mesas"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={() => abrirModalReserva(mesa)}
                          className="text-gray-400 hover:text-yellow-600 transition-colors cursor-pointer"
                          title="Agenda de Reservas"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                        </button>

                        <button 
                          onClick={() => abrirModalEdicao(mesa)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                        </button>

                        <button 
                          onClick={() => confirmarExclusao(mesa)}
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* MODAL JUNTAR MESAS */}
      {modalJuntarAberto && mesaPrincipalParaJuntar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque rounded-2xl w-full max-w-md shadow-2xl relative p-6">
            <button
              onClick={() => setModalJuntarAberto(false)}
              className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl cursor-pointer"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-1 text-header font-header">
              Juntar à Mesa {mesaPrincipalParaJuntar.id}
            </h2>
            <p className="text-sm text-header/70 mb-4">
              Selecione as mesas livres que serão agrupadas a esta mesa principal.
            </p>

            {erroJuntar && (
              <div className="mb-4 rounded-md bg-red-100 border border-red-200 p-3 text-sm text-red-700 font-medium">
                Erro: {erroJuntar}
              </div>
            )}

            <form onSubmit={handleSubmitJuntar}>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4 flex flex-col gap-2">
                {mesas.filter(m => m.id !== mesaPrincipalParaJuntar.id && (m.status_dinamico || m.status) === "LIVRE").length > 0 ? (
                  mesas
                    .filter(m => m.id !== mesaPrincipalParaJuntar.id && (m.status_dinamico || m.status) === "LIVRE")
                    .map(m => (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          mesasSelecionadasParaJuntar.includes(m.id)
                            ? "bg-yellow-50 border-hover"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={mesasSelecionadasParaJuntar.includes(m.id)}
                            onChange={() => toggleSelecaoMesaJuntar(m.id)}
                            className="w-4 h-4 text-hover rounded focus:ring-hover cursor-pointer"
                          />
                          <span className="font-bold text-header">Mesa {m.id}</span>
                        </div>
                        <span className="text-xs text-header/70 font-medium">{m.capacidade} lugares</span>
                      </label>
                    ))
                ) : (
                  <p className="p-4 text-center text-sm text-gray-500">Nenhuma outra mesa LIVRE disponível no momento.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-header/10">
                <button
                  type="button"
                  onClick={() => setModalJuntarAberto(false)}
                  className="bg-white text-header px-4 py-2 rounded-md font-bold text-sm border border-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregandoJuntar || mesasSelecionadasParaJuntar.length === 0}
                  className="bg-hover text-header px-4 py-2 rounded-md font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {carregandoJuntar ? "Agrupando..." : "Confirmar Junção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE SEPARAR MESA */}
      {modalSepararAberto && mesaParaSeparar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl text-center border-t-4 border-red-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-3 font-header">Separar Mesas?</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja desagrupar todas as mesas vinculadas à <strong>Mesa {mesaParaSeparar.id}</strong>?
            </p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setModalSepararAberto(false)}
                className="bg-white text-gray-800 px-6 py-2.5 rounded-md font-bold hover:bg-gray-50 border border-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executarSepararMesas}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-bold transition-colors cursor-pointer"
              >
                Sim, Separar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE MESA */}
      {mesaParaExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-destaque p-8 rounded-xl w-full max-w-md shadow-2xl text-center border-t-4 border-red-500">
            <h3 className="text-2xl font-bold text-header mb-3 font-header">Remover Mesa?</h3>
            <p className="text-header/80 mb-6">
              Tem certeza que deseja remover a <strong>Mesa {mesaParaExcluir.id}</strong>?
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

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO DE RESERVA */}
      {reservaParaCancelar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl text-center border-t-4 border-red-500 relative">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cancelar Reserva?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Deseja remover a reserva de <strong>{reservaParaCancelar.cliente_nome}</strong> agendada para <strong>{reservaParaCancelar.data_reserva}</strong> às <strong>{reservaParaCancelar.hora_reserva}</strong>?
            </p>

            {erroCancelamentoReserva && (
              <div className="mb-4 rounded-md bg-red-100 border border-red-200 p-2.5 text-xs text-red-700 font-medium">
                {erroCancelamentoReserva}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                disabled={carregandoCancelamento}
                onClick={() => setReservaParaCancelar(null)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-bold text-sm border border-gray-300 cursor-pointer hover:bg-gray-200"
              >
                Manter
              </button>
              <button
                disabled={carregandoCancelamento}
                onClick={confirmarCancelamentoReserva}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {carregandoCancelamento ? "Cancelando..." : "Sim, Cancelar"}
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
              {editandoId ? `Editar Mesa ${editandoId}` : "Nova Mesa"}
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
                <label className="block text-sm font-bold mb-2 text-header">Status Físico Atual</label>
                <select
                  name="status"
                  value={formDataMesa.status}
                  onChange={handleChangeMesa}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover bg-white text-header"
                >
                  <option value="LIVRE">Livre</option>
                  <option value="OCUPADA">Ocupada</option>
                  {editandoId && (
                    <option value="RESERVADA">Reservada (Ir para formulário de reserva)</option>
                  )}
                  <option value="AGRUPADA">Agrupada</option>
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

      {/* MODAL DE AGENDA DE RESERVAS */}
      {modalReservaAberto && mesaParaReservar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-destaque rounded-2xl w-full max-w-lg shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalReservaAberto(false)}
              className="absolute top-4 right-6 text-header/50 hover:text-header font-bold text-3xl cursor-pointer"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-1 text-header font-header">
              Agenda da Mesa {mesaParaReservar.id}
            </h2>
            <p className="text-sm text-header/70 mb-4">
              Capacidade: <strong>{mesaParaReservar.capacidade} lugares</strong>
            </p>

            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-header mb-3 uppercase tracking-wide">
                Reservas Agendadas
              </h3>

              {mesaParaReservar.reservas && mesaParaReservar.reservas.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {mesaParaReservar.reservas.map((res) => {
                    const temMesasAgrupadas = res.mesas_agrupadas_ids && res.mesas_agrupadas_ids.length > 0;
                    
                    return (
                      <div 
                        key={res.id || `${res.cliente_nome}-${res.data_reserva}`} 
                        onClick={() => selecionarReservaParaEdicao(res)}
                        className={`flex justify-between items-center p-3 rounded-lg text-sm border cursor-pointer hover:shadow-sm transition-all ${
                          temMesasAgrupadas 
                            ? "bg-yellow-50 border-hover hover:bg-yellow-100" 
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        } ${editandoReservaId === res.id ? "ring-2 ring-hover" : ""}`}
                        title="Clique para editar esta reserva"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-bold ${temMesasAgrupadas ? "text-header" : "text-gray-900"}`}>
                              {res.cliente_nome}
                            </p>
                            {temMesasAgrupadas && (
                              <span className="bg-hover text-header text-[10px] px-2 py-0.5 rounded-full font-bold">
                                Reserva de Grupo
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${temMesasAgrupadas ? "text-header/80" : "text-gray-600"} mt-0.5`}>
                            Data: {res.data_reserva} às {res.hora_reserva} {res.cliente_telefone && `| Tel: ${res.cliente_telefone}`}
                          </p>
                          {temMesasAgrupadas && (
                            <p className="text-xs font-semibold text-header mt-1">
                              Mesas Agrupadas: {res.mesa} e {res.mesas_agrupadas_ids.join(", ")}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => solicitarCancelamentoReserva(res, e)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold underline cursor-pointer px-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-500 mt-2 text-center">Clique em uma reserva acima para editá-la.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Nenhuma reserva futura agendada para esta mesa.</p>
              )}
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-header uppercase tracking-wide">
                {editandoReservaId ? "Editando Reserva" : "+ Adicionar Nova Reserva"}
              </h3>
              {editandoReservaId && (
                <button 
                  onClick={limparFormularioReserva}
                  className="text-xs text-red-500 hover:text-red-700 font-bold underline cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            {erroFormulario && (
              <div className="mb-4 rounded-md bg-red-100 border border-red-200 p-3 text-sm text-red-700 font-medium">
                Erro: {erroFormulario}
              </div>
            )}

            <form onSubmit={handleSubmitReserva} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-header">Nome do Cliente *</label>
                <input
                  required
                  type="text"
                  name="cliente_nome"
                  placeholder="Ex: Maria Silva"
                  value={formDataReserva.cliente_nome}
                  onChange={handleChangeReserva}
                  className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover bg-white text-header text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-header">Telefone / WhatsApp</label>
                <input
                  type="text"
                  name="cliente_telefone"
                  placeholder="(00) 00000-0000"
                  value={formDataReserva.cliente_telefone}
                  onChange={handleChangeReserva}
                  className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover bg-white text-header text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-header">Data *</label>
                  <input
                    required
                    type="date"
                    name="data_reserva"
                    value={formDataReserva.data_reserva}
                    onChange={handleChangeReserva}
                    className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover bg-white text-header text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-header">Horário *</label>
                  <input
                    required
                    type="time"
                    name="hora_reserva"
                    value={formDataReserva.hora_reserva}
                    onChange={handleChangeReserva}
                    className="w-full border border-gray-300 p-2.5 rounded-md focus:outline-none focus:border-hover bg-white text-header text-sm"
                  />
                </div>
              </div>
              {/* SELEÇÃO DE MESAS PARA AGRUPAR */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Agrupar com outras mesas (Opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {mesas
                    .filter((m) => m.id !== mesaParaReservar.id && m.status !== "INATIVA")
                    .map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                          formDataReserva.mesas_agrupadas_ids?.includes(m.id)
                            ? "bg-hover border-hover text-header font-semibold"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          value={m.id}
                          checked={formDataReserva.mesas_agrupadas_ids?.includes(m.id) || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormDataReserva((prev) => {
                              const atuais = prev.mesas_agrupadas_ids || [];
                              const novosIds = isChecked
                                ? [...atuais, m.id]
                                : atuais.filter((id) => id !== m.id);
                              return { ...prev, mesas_agrupadas_ids: novosIds };
                            });
                          }}
                        />
                        Mesa {m.id}
                      </label>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selecione as mesas que farão parte desta mesma reserva.
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-header/10">
                <button
                  type="button"
                  onClick={() => setModalReservaAberto(false)}
                  className="bg-white text-header px-4 py-2 rounded-md font-bold text-sm border border-gray-300 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="bg-hover text-header px-4 py-2 rounded-md font-bold text-sm transition-colors cursor-pointer"
                >
                  {editandoReservaId ? "Atualizar Reserva" : "Salvar Reserva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}