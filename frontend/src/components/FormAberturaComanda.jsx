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

  // Estado para armazenar o número da mesa do tablet
  const [idMesa, setIdMesa] = useState('');

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
    } else {
      // Se não tem na URL, busca o que já estava salvo neste tablet 
      // usa "1" por padrão se nada foi configurado
      const mesaSalva = localStorage.getItem('id_mesa_tablet') || '1';
      setIdMesa(mesaSalva);
    }

  }, []);

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

      if (aoSucesso) aoSucesso();
      window.location.href = '/cardapio';

    } catch (erro) {
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
            <p className="text-[#F4F0E5] font-semibold tracking-widest">MESA {idMesa.padStart(2,'0')}</p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Fundo Claro com o Formulário */}
      <div className="w-full md:w-3/4 flex items-center justify-center p-8 lg:p-16">
        
        {/* Cartão do Formulário */}
        <div className="w-full max-w-xl bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
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
                disabled={carregando}
                className="w-full py-4 bg-[#D4AF43] text-header font-bold text-xl rounded-2xl hover:bg-[#c29f39] active:scale-[0.98] transition-all shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {carregando ? 'Abrindo Comanda...' : 'Abrir Comanda'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
