import { useEffect, useState } from "react";
import { mensagemDoErro, requisicaoApi } from "../utils/api.js";

// Busca uma ou mais listas da API e devolve, na mesma ordem, o resultado de cada URL.
// Exemplo: const { dados, erro, carregando, recarregar } = useDadosApi(["/api/mesas/"]);
export function useDadosApi(urls) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  // Mudar a versão faz o efeito rodar de novo, ou seja, recarrega os dados.
  const [versao, setVersao] = useState(0);
  const chave = urls.join("|");

  useEffect(() => {
    let ativo = true;

    Promise.all(chave.split("|").map((url) => requisicaoApi(url)))
      .then((respostas) => {
        if (!ativo) return;
        setDados(respostas.map((resposta) => resposta.results || resposta));
        setErro("");
      })
      .catch((falha) => {
        if (ativo) setErro(mensagemDoErro(falha));
      });

    // Ignora a resposta se a tela foi fechada antes de ela chegar.
    return () => {
      ativo = false;
    };
  }, [chave, versao]);

  return {
    dados: dados || urls.map(() => []),
    erro,
    carregando: dados === null && !erro,
    recarregar: () => setVersao((atual) => atual + 1),
  };
}
