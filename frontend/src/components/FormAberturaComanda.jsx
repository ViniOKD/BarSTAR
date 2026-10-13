import { useState, useEffect } from 'react';
import logo from "../assets/logo.svg";

export function FormAberturaComanda({ aoSucesso }) {
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  //Mensagens de Erro
  const [erroCpf, setErroCpf] = useState('');
  const [erroTelefone, setErroTelefone] = useState('');
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [segundos, setSegundos] = useState(5);
  // Estado para armazenar o número da mesa do tablet
  const [idMesa, setIdMesa] = useState(() => {
    const parametrosUrl = new URLSearchParams(window.location.search);
    return parametrosUrl.get('mesa') || localStorage.getItem('id_mesa_tablet') || null;
  });
  const mesaIdentificada = Boolean(idMesa);
  useEffect(() => {

    // Redirecionamento se a comanda já estiver aberta
    const comandaAtiva = localStorage.getItem('comandaAtiva');
    if (comandaAtiva === 'true') {
      window.location.href = '/cardapio'; 
      return;
    }

    // Lógica de Identificação da Mesa 
    // COMO CONFIGURAR O TABLET: O gerente deve acessar o sistema pela primeira vez
    // passando o número da mesa na URL do tablet (ex: http://localhost:5173/?mesa=5).
    // Se o tablet mudar de mesa física, basta repetir esse processo com o novo número.
    const parametrosUrl = new URLSearchParams(window.location.search);
    const mesaUrl = parametrosUrl.get('mesa');

    if (mesaUrl) {
      // Se obteve identificação, o tablet sabe sempre a qual mesa pertence mesmo que reiniciado
      localStorage.setItem('id_mesa_tablet', mesaUrl);
      setIdMesa(mesaUrl);
      // Limpa a URL para o cliente não ver o parâmetro
      window.history.replaceState(null, '', window.location.pathname);
    }

  }, []);
  // Contagem regressiva do popup de confirmação
  useEffect(() => {
    if (!mostrarConfirmacao) return;

    if (segundos <= 0) {
      setMostrarConfirmacao(false);
      if (aoSucesso) aoSucesso();
      window.location.href = '/cardapio';
      return;
    }

    const timer = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarConfirmacao, segundos]);


  // Formatação automática do CPF: 000.000.000-00
  const formatarCPF = (texto) => {
    return texto
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')       .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  // Formatação automática do Telefone: (00) 00000-0000
  const formatarTelefone = (texto) => {
    return texto
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const aoEnviar = async (evento) => {
    evento.preventDefault();
    if (!idMesa) {
      setErroGeral('Número da mesa não identificado. Chame o gerente para configurar.');
      return;
    }

    // Limpa erros anteriores
    setErroCpf('');
    setErroTelefone('');
    setErroGeral('');

    let temErro = false;
    const apenasNumerosCPF = cpf.replace(/\D/g, '');
    const apenasNumerosTel = telefone.replace(/\D/g, '');

    // Validação no Front-end antes de disparar a requisição
    if (!apenasNumerosCPF) {
      setErroCpf('Por favor, informe o CPF.');
      temErro = true;
    } else if (apenasNumerosCPF.length !== 11) {
      setErroCpf('CPF inválido. Verifique os 11 dígitos.');
      temErro = true;
    }

    if (!apenasNumerosTel) {
      setErroTelefone('Por favor, informe o telefone.');
      temErro = true;
    } else if (apenasNumerosTel.length < 10) {
      setErroTelefone('Telefone inválido. Inclua o DDD e número.');
      temErro = true;
    }

    if (temErro) return;

    setCarregando(true);

    try {
      // CONEXÃO COM O BACK-END (DJANGO)
      const resposta = await fetch(`/api/mesas/${parseInt(idMesa, 10)}/abrir-comanda/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: apenasNumerosCPF,
          telefone: apenasNumerosTel,
        }),
      });

      const dados = await resposta.json();

      // Se o Back-end (Django) recusar e retornar erro 400
      if (!resposta.ok) {
        if (dados.cpf) setErroCpf(dados.cpf[0]);
        if (dados.telefone) setErroTelefone(dados.telefone[0]);
        if (dados.erro) setErroGeral(dados.erro);
        setCarregando(false);
        return;
      }
      
      // Salva localmente e redireciona
      localStorage.setItem('comandaAtiva', 'true');
      localStorage.setItem('clienteCPF', apenasNumerosCPF);
      localStorage.setItem('clienteTelefone', apenasNumerosTel);

      setCarregando(false);
      setSegundos(5);              // reinicia a contagem
      setMostrarConfirmacao(true); // abre o popup
  

    } catch {
      setErroGeral('Não foi possível conectar ao servidor. Verifique a conexão.');
      setCarregando(false);
    }
  };

  return (
    // Container principal em Flex Row (lado a lado) com a cor de fundo clara
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-[#F4F0E5]">

      {/* Lado Esquerdo - Painel Escuro para a Logo */}
      <div className="w-full md:w-1/4 bg-header flex flex-col items-center justify-center p-10 shadow-2xl z-10">
        <img 
          src={logo} 
          alt="Logo BarStar" 
          className="w-48 h-auto mb-6 drop-shadow-lg" 
        />
        
        {/* Um indicador de mesa embaixo da logo */}
        <div className="mt-auto pt-10">
          <div className="bg-[#2a3037] px-6 py-2 rounded-full border border-[#D4AF43]/20">
            <p className="text-[#F4F0E5] font-semibold tracking-widest">MESA {idMesa ? idMesa.padStart(2,'0') : '--'}</p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Fundo Claro com o Formulário */}
      <div className="w-full md:w-3/4 flex items-center justify-center p-8 lg:p-16">
        
        {/* Cartão do Formulário */}
        <div className="w-full max-w-xl bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
          {!mesaIdentificada && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600">
            Este tablet não está configurado com uma mesa. Chame o gerente para configurar.
          </div>
        )}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-header">Iniciar Atendimento</h2>
            <p className="text-gray-500 mt-2 text-base">
              Vincule seus dados para abrir a comanda desta mesa.
            </p>
          </div>

          <form onSubmit={aoEnviar} className="space-y-6">
            <div>
              <label htmlFor="cpf" className="block text-sm font-semibold text-header mb-2">
                CPF do Titular
              </label>
              <input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => {
                  setCpf(formatarCPF(e.target.value));
                  if (erroCpf) setErroCpf('');
                  if (erroGeral) setErroGeral('');
                }}
                className={`w-full px-5 py-4 bg-[#F4F0E5]/50 border rounded-2xl outline-none text-header transition text-lg ${
                  erroCpf
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50'
                    : 'border-gray-200 focus:border-[#D4AF43] focus:ring-2 focus:ring-[#D4AF43]/30'
                }`}
              />
              {erroCpf && <p className="text-red-500 text-sm mt-2 font-medium px-1">{erroCpf}</p>}
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-semibold text-header mb-2">
                Telefone (WhatsApp)
              </label>
              <input
                id="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => {
                  setTelefone(formatarTelefone(e.target.value));
                  if (erroTelefone) setErroTelefone('');
                  if (erroGeral) setErroGeral('');
                }}
                className={`w-full px-5 py-4 bg-[#F4F0E5]/50 border rounded-2xl outline-none text-header transition text-lg ${
                  erroTelefone
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50'
                    : 'border-gray-200 focus:border-[#D4AF43] focus:ring-2 focus:ring-[#D4AF43]/30'
                }`}
              />
              {erroTelefone && <p className="text-red-500 text-sm mt-2 font-medium px-1">{erroTelefone}</p>}
            </div>

            <div className="pt-6">
              {erroGeral && (
                <p className="text-red-500 text-sm mb-4 font-medium text-center">{erroGeral}</p>
              )}
              <button
                type="submit"
                disabled={carregando || !mesaIdentificada}
                className="w-full py-4 bg-[#D4AF43] text-header font-bold text-xl rounded-2xl hover:bg-[#c29f39] active:scale-[0.98] transition-all shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {carregando ? 'Abrindo Comanda...' : 'Abrir Comanda'}
              </button>
            </div>
          </form>
        </div>

      </div>
      {mostrarConfirmacao && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-header">Comanda aberta com sucesso!</h3>
          <p className="mt-2 text-gray-500">
            A comanda da mesa {idMesa ? idMesa.padStart(2, '0') : '--'} foi criada.
          </p>
          <p className="mt-4 text-sm text-gray-400">
            Você será direcionado ao cardápio em {segundos}s...
          </p>
          <button
            type="button"
            onClick={() => setSegundos(0)}
            className="mt-6 w-full rounded-2xl bg-[#D4AF43] py-4 text-lg font-bold text-header transition-all hover:bg-[#c29f39] active:scale-[0.98]"
          >
            Ir para o cardápio agora
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
