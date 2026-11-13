import { useEffect, useRef, useState } from "react";
import seta from "../../assets/setadourada.png";
import { requisicaoApi } from "../../utils/api";

export default function SolicitacoesGarcom() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoId, setCarregandoId] = useState(null);
  const [erro, setErro] = useState("");
  const solicitacoesConhecidas = useRef(null);

  // Filtros
  const [mesaSelecionada, setMesaSelecionada] = useState("TODAS");
  const [abaSelecionada, setAbaSelecionada] = useState("PENDENTES");

  // Converte a resposta do servidor em JSON com tratamento de erro
  const lerRespostaJSON = async (resposta) => {
    const texto = await resposta.text();

    if (!texto.trim()) {
      return null;
    }

    try {
      return JSON.parse(texto);
    } catch {
      console.error("Resposta recebida do servidor:", texto);
      throw new Error("O servidor não retornou um JSON válido.");
    }
  };

  // Busca as solicitações cadastradas no banco de dados
  useEffect(() => {
    let ativo = true;

    const tocarSom = async () => {
      try {
        const AudioContext =
          window.AudioContext || window.webkitAudioContext;

        const contexto = new AudioContext();

        await contexto.resume();

        const oscilador = contexto.createOscillator();
        const volume = contexto.createGain();

        oscilador.connect(volume);
        volume.connect(contexto.destination);

        oscilador.frequency.value = 880;
        volume.gain.value = 0.2;

        oscilador.start();
        oscilador.stop(contexto.currentTime + 0.3);

        oscilador.onended = () => contexto.close();
      } catch (erro) {
        console.error("Não foi possível reproduzir o alerta:", erro);
      }
    };

    const buscarSolicitacoes = async () => {
      try {
        const resposta = await fetch("/api/solicitacoes/");

        const dados = await lerRespostaJSON(resposta);

        if (!resposta.ok) {
          throw new Error(
            dados?.detail ||
            dados?.erro ||
            `Não foi possível carregar as solicitações. HTTP ${resposta.status}`
          );
        }

        if (!dados) {
          throw new Error("O servidor retornou uma resposta vazia.");
        }

        const lista = Array.isArray(dados)
          ? dados
          : dados.results || [];

        if (!ativo) return;

        // Primeira consulta: registra as solicitações existentes.
        if (solicitacoesConhecidas.current === null) {
          solicitacoesConhecidas.current = new Set(
            lista.map(solicitacao => solicitacao.id)
          );
        } else {
          // Verifica se chegaram novas solicitações de atendimento.
          const novasSolicitacoes = lista.filter(
            solicitacao =>
              !solicitacoesConhecidas.current.has(solicitacao.id) &&
              solicitacao.status === "PENDENTE" &&
              solicitacao.tipo === "ATENDIMENTO"
          );

          if (novasSolicitacoes.length > 0) {
            tocarSom();
          }

          // Atualiza os IDs conhecidos.
          solicitacoesConhecidas.current = new Set(
            lista.map(solicitacao => solicitacao.id)
          );
        }

        setSolicitacoes(lista);
        setErro("");

      } catch (erro) {
        console.error("Erro ao buscar solicitações:", erro);

        if (ativo) {
          setErro(erro.message || "Erro ao conectar com o servidor.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    };

    buscarSolicitacoes();

    const intervalo = setInterval(buscarSolicitacoes, 5000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);
  //Define texto e cores de cada status
  const obterEstiloStatus = (status) => {
    switch (status) {
      case "PENDENTE":
        return {
          texto: "Pendente",
          cor: "bg-[#FCE4D8] text-[#E85D04]",
        };

      case "ATENDIDA":
        return {
          texto: "Atendida",
          cor: "bg-[#DDF3E4] text-[#24834A]",
        };

      case "CANCELADA":
        return {
          texto: "Cancelada",
          cor: "bg-[#E5E5E5] text-[#666666]",
        };

      default:
        return {
          texto: status,
          cor: "bg-gray-100 text-gray-600",
        };
    }
  };

  // Converte o tipo recebido da API
  const obterTipoSolicitacao = (tipo) => {
    switch (tipo) {
      case "ATENDIMENTO":
        return "Atendimento";

      case "FECHAMENTO":
        return "Fechamento de comanda";

      default:
        return tipo;
    }
  };

  // Obtém o número da comanda
  const obterNumeroComanda = (solicitacao) => {
      return solicitacao.comanda ?? "Não identificada";
  };

  // Obtém o número da mesa 
  const obterMesa = (solicitacao) => {
    return solicitacao.mesa ?? "Não identificada";
  };

  // Formata a data e o horário das solicitações
  const formatarData = (data) => {
    if (!data) return "Horário não informado";

    const dataFormatada = new Date(data);

    if (Number.isNaN(dataFormatada.getTime())) {
      return "Horário não informado";
    }

    return dataFormatada.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Confirma o atendimento usando o ID recebido
  const confirmarAtendimento = async (idSolicitacao) => {
    try {
      setCarregandoId(idSolicitacao);

      // requisicaoApi envia o token CSRF exigido de quem está logado.
      const dados = await requisicaoApi(
        `/api/solicitacoes/${idSolicitacao}/atender/`,
        { method: "PATCH" }
      );

      // Atualiza só a solicitação atendida
      setSolicitacoes((listaAtual) =>
        listaAtual.map((solicitacao) =>
          solicitacao.id === idSolicitacao
            ? { ...solicitacao, ...dados }
            : solicitacao
        )
      );

    } catch (erro) {
      console.error("Erro ao confirmar atendimento:", erro);
      alert(erro.message || "Erro ao conectar com o servidor.");
    } finally {
      setCarregandoId(null);
    }
  };

  // Cria uma lista de mesas sem repetição
  const mesasDisponiveis = [
    ...new Map(
      solicitacoes.map((solicitacao) => {
            const mesa = solicitacao.mesa ?? "Não identificada";
            return [
                String(mesa),
                { id: String(mesa), numero: mesa },
            ];
        })
    ).values(),
  ].sort((a, b) =>
    String(a.numero).localeCompare(String(b.numero), "pt-BR", {
      numeric: true,
    })
  );

  // Aplica os filtros de mesa e aba selecionada
  const solicitacoesFiltradas = solicitacoes.filter((solicitacao) => {
      const correspondeMesa =
          mesaSelecionada === "TODAS" ||
          String(solicitacao.mesa) === String(mesaSelecionada);

      const correspondeAba =
          abaSelecionada === "PENDENTES"
              ? solicitacao.status === "PENDENTE"
              : solicitacao.status === "ATENDIDA";

      return correspondeMesa && correspondeAba;
  });

  return (
    <main className="flex flex-col gap-8 text-header">
      <header>
        <h1 className="font-header text-2xl font-bold">
          Solicitações
        </h1>

        <p className="mt-2 font-extralight text-header">
          Acompanhe os chamados realizados pelos clientes.
        </p>
      </header>

      {/* Filtros e listagem das mesas */}
      <section className="flex flex-col gap-5">
        {/* Abas de solicitações */}
        <div className="flex gap-3">
          <button
            onClick={() => setAbaSelecionada("PENDENTES")}
            className={`rounded-full px-6 py-3 text-sm font-semibold ${
              abaSelecionada === "PENDENTES"
                ? "bg-[#D4AF43] text-white"
                : "border border-[#D4AF43] text-header"
            }`}
          >
            Pendentes
          </button>

          <button
            onClick={() => setAbaSelecionada("ATENDIDAS")}
            className={`rounded-full px-6 py-3 text-sm font-semibold ${
              abaSelecionada === "ATENDIDAS"
                ? "bg-[#D4AF43] text-white"
                : "border border-[#D4AF43] text-header"
            }`}
          >
            Atendidas
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">
            Filtrar por:
          </p>

          {/*Filtro por mesa */}
          <div className="relative">
            <select
              value={mesaSelecionada}
              onChange={(e) => setMesaSelecionada(e.target.value)}
              className="appearance-none rounded-full border border-[#D4AF43]
              bg-white pl-5 pr-12 py-3 text-sm font-medium cursor-pointer
              focus:outline-none focus:ring-1 focus:ring-[#D4AF43]"
            >
              <option value="TODAS">Todas as mesas</option>

              {mesasDisponiveis.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.numero}
                </option>
              ))}
            </select>

            <img
              src={seta}
              alt=""
              className="pointer-events-none absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 object-contain"
            />
          </div>
        </div>

        {/* Listagem das solicitações */}
        <div className="flex flex-col gap-4">

          {carregando && (
            <p className="text-center text-sm text-gray-500">
              Carregando solicitações...
            </p>
          )}

          {erro && (
            <p className="text-center text-sm text-red-600">
              {erro}
            </p>
          )}

          {!carregando && !erro && solicitacoesFiltradas.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              Nenhuma solicitação encontrada para os filtros selecionados.
            </p>
          )}

          {!carregando && !erro && solicitacoesFiltradas.map((solicitacao) => {
            const estiloStatus = obterEstiloStatus(solicitacao.status);
            const estaCarregando = carregandoId === solicitacao.id;

            return (
              <div
                key={solicitacao.id}
                className="w-full flex items-center justify-between gap-4 rounded-xl border border-[#D4AF43] p-4"
              >
                {/* Informações da solicitação */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-header font-semibold">
                    Mesa {obterMesa(solicitacao)}
                  </h3>
                  <p className="text-sm text-header">
                    Comanda {obterNumeroComanda(solicitacao)}
                  </p>
                  <p className="text-sm text-header">
                    {obterTipoSolicitacao(solicitacao.tipo)}
                  </p>
                  <p className="text-sm text-header">
                    {formatarData(solicitacao.data_solicitacao)}
                  </p>
                </div>

                {/* Status e confirmação */}
                <div className="flex flex-col items-end gap-8">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${estiloStatus.cor}`}
                  >
                    {estiloStatus.texto}
                  </span>

                  <button
                    onClick={() => confirmarAtendimento(solicitacao.id)}
                    disabled={
                      solicitacao.status !== "PENDENTE" ||
                      estaCarregando
                    }
                    className="w-[220px] rounded-full bg-[#D4AF43]
                    px-4 py-3 text-sm font-semibold text-white
                    cursor-pointer active:translate-y-[2px]
                    disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {estaCarregando
                      ? "Confirmando..."
                      : solicitacao.status === "ATENDIDA"
                        ? "Atendimento confirmado"
                        : solicitacao.status === "CANCELADA"
                          ? "Solicitação cancelada"
                          : "Confirmar atendimento"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
