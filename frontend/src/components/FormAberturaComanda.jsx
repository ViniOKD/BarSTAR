import { useState } from 'react';

export function FormAberturaComanda({ aoSucesso }) {
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // Mensagens de erro
  const [erroCpf, setErroCpf] = useState('');
  const [erroTelefone, setErroTelefone] = useState('');
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

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
      const resposta = await fetch('http://localhost:8000/api/comandas/abrir/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: apenasNumerosCPF,
          telefone: apenasNumerosTel,
          id_mesa: 1, // Mesa padrão para testes
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

      if (aoSucesso) {
        aoSucesso();
      }

      window.location.href = '/cardapio';

    } catch (erro) {
      setErroGeral('Não foi possível conectar ao servidor. Verifique se o Back-end está rodando.');
      setCarregando(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
      <div className="border-b border-gray-100 pb-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Abertura de Comanda</h2>
        <p className="text-gray-500 mt-2 text-base">
          Preencha as informações abaixo para iniciar seu pedido.
        </p>
      </div>

      <form onSubmit={aoEnviar} className="space-y-6">
        {/* Campo CPF */}
        <div>
          <label htmlFor="cpf" className="block text-sm font-semibold text-gray-700 mb-2">
            CPF
          </label>
          <input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => {
              setCpf(formatarCPF(e.target.value));
              if (erroCpf) setErroCpf('');
              if (erroGeral) setErroGeral(''); // Limpa o erro geral ao digitar
            }}
            className={`w-full px-4 py-3 border rounded-xl outline-none text-gray-800 transition ${
              erroCpf
                ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:ring-2 focus:ring-[#D4AF43]'
            }`}
          />
          {erroCpf && (
            <p className="text-red-500 text-sm mt-1.5 font-medium">{erroCpf}</p>
          )}
        </div>

        {/* Campo Telefone */}
        <div>
          <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2">
            Telefone
          </label>
          <input
            id="telefone"
            type="tel"
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={(e) => {
              setTelefone(formatarTelefone(e.target.value));
              if (erroTelefone) setErroTelefone('');
              if (erroGeral) setErroGeral(''); // Limpa o erro geral ao digitar
            }}
            className={`w-full px-4 py-3 border rounded-xl outline-none text-gray-800 transition ${
              erroTelefone
                ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:ring-2 focus:ring-[#D4AF43]'
            }`}
          />
          {erroTelefone && (
            <p className="text-red-500 text-sm mt-1.5 font-medium">{erroTelefone}</p>
          )}
        </div>

        {/* Botão de envio e Erro Geral */}
        <div className="pt-4">
          {erroGeral && (
            <p className="text-red-500 text-sm mb-3 font-medium text-center">{erroGeral}</p>
          )}
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-4 bg-[#D4AF43] text-gray-900 font-bold text-lg rounded-xl hover:opacity-90 active:scale-[0.99] transition shadow-sm disabled:opacity-50"
          >
            {carregando ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}