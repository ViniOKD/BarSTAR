import { useEffect, useState } from "react";
import FormFuncionario from "../../components/FormFuncionario.jsx";
import { requisicaoApi } from "../../utils/api.js";
import { cargos, formatarCpf, formatarTelefone } from "../../utils/funcionarios.js";

function LinhaFuncionario({ funcionario, ocupado, onEditar, onAlternarAtivo }) {
  return (
    <tr className="border-t border-gray-200">
      <th scope="row" className="p-3 font-semibold">{funcionario.nome}</th>
      <td className="p-3">{formatarCpf(funcionario.cpf)}</td>
      <td className="p-3">{formatarTelefone(funcionario.tel)}</td>
      <td className="p-3">{cargos[funcionario.cargo]}</td>
      <td className="p-3">
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${funcionario.ativo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
          {funcionario.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onEditar(funcionario)} disabled={ocupado} className="font-semibold text-emerald-800 underline disabled:opacity-60">
            Editar
          </button>
          <button type="button" onClick={() => onAlternarAtivo(funcionario)} disabled={ocupado} className="font-semibold text-red-700 underline disabled:opacity-60">
            {funcionario.ativo ? "Inativar" : "Ativar"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Usuarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  // null = fechado; { funcionario: null } = novo; { funcionario } = edição
  const [formulario, setFormulario] = useState(null);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erroAcao, setErroAcao] = useState("");

  useEffect(() => {
    requisicaoApi("/api/funcionarios/")
      .then((lista) => setFuncionarios(lista.results || lista))
      .catch((erro) => setErroLista(erro.message))
      .finally(() => setCarregando(false));
  }, []);

  function abrirFormulario(funcionario = null) {
    setErroFormulario(null);
    setMensagem("");
    setErroAcao("");
    setFormulario({ funcionario });
  }

  // Troca o funcionário na lista pelo que voltou da API, ou acrescenta se for novo.
  function atualizarNaLista(salvo) {
    setFuncionarios((anteriores) => {
      const existe = anteriores.some((item) => item.id === salvo.id);
      if (!existe) return [...anteriores, salvo];
      return anteriores.map((item) => (item.id === salvo.id ? salvo : item));
    });
  }

  async function salvar(dados) {
    const id = formulario.funcionario?.id;
    setGravando(true);
    setErroFormulario(null);
    try {
      const salvo = await requisicaoApi(id ? `/api/funcionarios/${id}/` : "/api/funcionarios/", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(dados),
      });
      atualizarNaLista(salvo);
      setFormulario(null);
      setMensagem(id ? "Usuário atualizado." : "Usuário cadastrado.");
    } catch (erro) {
      setErroFormulario(erro);
    } finally {
      setGravando(false);
    }
  }

  async function alternarAtivo(funcionario) {
    const acao = funcionario.ativo ? "inativar" : "ativar";
    if (!window.confirm(`Deseja ${acao} ${funcionario.nome}?`)) return;

    setGravando(true);
    setMensagem("");
    setErroAcao("");
    try {
      const salvo = await requisicaoApi(`/api/funcionarios/${funcionario.id}/${acao}/`, { method: "POST" });
      atualizarNaLista(salvo);
      setMensagem(salvo.ativo ? "Usuário ativado." : "Usuário inativado. Ele não consegue mais entrar no sistema.");
    } catch (erro) {
      setErroAcao(erro.message);
    } finally {
      setGravando(false);
    }
  }

  const funcionariosFiltrados = funcionarios.filter(
    (funcionario) => filtroCargo === "" || funcionario.cargo === filtroCargo
  );

  return (
    <div className="pb-8 text-header">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-header text-3xl font-bold">Usuários</h1>
        <button type="button" onClick={() => abrirFormulario()} disabled={carregando || Boolean(erroLista)} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          Novo usuário
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="filtro-cargo" className="mr-2 font-semibold">Cargo</label>
        <select id="filtro-cargo" value={filtroCargo} onChange={(evento) => setFiltroCargo(evento.target.value)} className="rounded-md border border-gray-400 bg-white p-2">
          <option value="">Todos</option>
          {Object.entries(cargos).map(([valor, nome]) => (
            <option key={valor} value={valor}>{nome}</option>
          ))}
        </select>
      </div>

      {mensagem && <p role="status" className="mb-4 rounded-md bg-emerald-100 p-3 text-emerald-900">{mensagem}</p>}
      {erroAcao && <p role="alert" className="mb-4 rounded-md bg-red-100 p-3 text-red-800">{erroAcao}</p>}

      {carregando && <p role="status">Carregando usuários…</p>}
      {erroLista && <p role="alert" className="rounded-md bg-red-100 p-4 text-red-800">{erroLista}</p>}

      {!carregando && !erroLista && funcionariosFiltrados.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-6">Nenhum usuário encontrado.</p>
      )}

      {funcionariosFiltrados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="sr-only">Usuários cadastrados</caption>
            <thead className="bg-destaque">
              <tr>
                {["Nome", "CPF", "Telefone", "Cargo", "Situação", "Ações"].map((titulo) => (
                  <th key={titulo} scope="col" className="p-3 font-semibold">{titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funcionariosFiltrados.map((funcionario) => (
                <LinhaFuncionario
                  key={funcionario.id}
                  funcionario={funcionario}
                  ocupado={gravando}
                  onEditar={abrirFormulario}
                  onAlternarAtivo={alternarAtivo}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formulario && (
        <FormFuncionario
          funcionario={formulario.funcionario}
          salvando={gravando}
          erro={erroFormulario}
          onSalvar={salvar}
          onCancelar={() => setFormulario(null)}
        />
      )}
    </div>
  );
}
