import { useState } from "react";
import { mensagemDoErro, requisicaoApi } from "../../utils/api.js";
import { IMAGEM_PADRAO, dadosDoProduto, formularioDoProduto, validarProduto } from "../../utils/produtos.js";
import { ErroFormulario } from "./Avisos.jsx";
import Modal from "./Modal.jsx";

const campoClasse = "w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-hover focus:ring-1 focus:ring-hover bg-white text-header";
const rotuloClasse = "block text-sm font-bold mb-2 text-header";

// Um campo do formulário com o seu rótulo.
function Campo({ rotulo, largura = "", children }) {
  return (
    <label className={`block ${largura}`}>
      <span className={rotuloClasse}>{rotulo}</span>
      {children}
    </label>
  );
}

function CampoFoto({ imagem, onChange }) {
  return (
    <div className="md:col-span-5 flex flex-col gap-3">
      <span className="block text-sm font-bold text-header">Foto do Produto</span>
      <div className="relative group w-full aspect-square bg-gray-200/60 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center shadow-inner">
        <img src={imagem} alt="Preview Produto" className="w-full h-full object-cover" />
        <label htmlFor="imagem-upload" className="absolute inset-0 bg-black/40 text-white font-bold opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity cursor-pointer text-sm">
          Alterar Foto
        </label>
      </div>
      <input id="imagem-upload" type="file" accept="image/png, image/jpeg, image/webp" name="imagem" onChange={onChange} className="hidden" />
      <p className="text-xs text-gray-500 text-center">Formatos aceitos: PNG, JPG ou WEBP.</p>
    </div>
  );
}

// Campos que só existem para pratos.
function CamposPrato({ formulario, onChange }) {
  return (
    <div className="flex gap-4 bg-white p-4 rounded-md border border-gray-200">
      <Campo rotulo="Peso (g)" largura="w-1/2">
        <input type="number" min="1" name="peso" required value={formulario.peso} onChange={onChange} className={campoClasse} />
      </Campo>
      <Campo rotulo="Preparo (min)" largura="w-1/2">
        <input type="number" min="1" name="tempo_preparo_minutos" required value={formulario.tempo_preparo_minutos} onChange={onChange} className={campoClasse} />
      </Campo>
    </div>
  );
}

// Campos que só existem para bebidas.
function CamposBebida({ formulario, onChange }) {
  return (
    <div className="flex gap-4 bg-white p-4 rounded-md border border-gray-200">
      <Campo rotulo="Teor alcoólico (%)" largura="w-1/2">
        <input type="number" min="0" max="100" step="0.1" name="teor_alcoolico" required value={formulario.teor_alcoolico} onChange={onChange} className={campoClasse} />
        <span className="mt-1 block text-xs text-gray-500">Informe 0 para bebidas sem álcool.</span>
      </Campo>
      <Campo rotulo="Volume (ml)" largura="w-1/2">
        <input type="number" min="1" name="volume_ml" value={formulario.volume_ml} onChange={onChange} className={campoClasse} />
      </Campo>
    </div>
  );
}

// Formulário de cadastro e edição de produto. "produto" vazio significa cadastro.
export default function FormProduto({ produto, categorias, onFechar, onSucesso }) {
  const [formulario, setFormulario] = useState(() => formularioDoProduto(produto));
  const [previaImagem, setPreviaImagem] = useState(produto?.imagem || IMAGEM_PADRAO);
  const [erro, setErro] = useState("");

  // O tipo da categoria escolhida define quais campos extras aparecem.
  const categoria = categorias.find((item) => String(item.id) === String(formulario.categoria_id));
  const tipoCategoria = categoria?.tipo_categoria;

  function alterar(evento) {
    const { name, value, type, checked, files } = evento.target;

    if (type === "file") {
      const arquivo = files[0];
      if (!arquivo) return;
      setFormulario({ ...formulario, imagem: arquivo });
      setPreviaImagem(URL.createObjectURL(arquivo));
      return;
    }

    setFormulario({ ...formulario, [name]: type === "checkbox" ? checked : value });
  }

  async function salvar(evento) {
    evento.preventDefault();

    const erroDeValidacao = validarProduto(formulario, tipoCategoria);
    setErro(erroDeValidacao);
    if (erroDeValidacao) return;

    try {
      await requisicaoApi(produto ? `/api/itens/${produto.id}/` : "/api/itens/", {
        method: produto ? "PUT" : "POST",
        body: dadosDoProduto(formulario, tipoCategoria),
      });
      onSucesso(produto ? "Produto atualizado!" : "Produto cadastrado!");
    } catch (falha) {
      setErro(mensagemDoErro(falha));
    }
  }

  return (
    <Modal titulo={produto ? "Editar Produto" : "Novo Produto"} largura="max-w-4xl" onFechar={onFechar}>
      <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <CampoFoto imagem={previaImagem} onChange={alterar} />

        <div className="md:col-span-7 flex flex-col gap-5">
          <ErroFormulario mensagem={erro} />

          <Campo rotulo="Nome do Produto">
            <input required name="nome" value={formulario.nome} onChange={alterar} className={campoClasse} />
          </Campo>

          <Campo rotulo="Descrição">
            <textarea name="descricao" value={formulario.descricao} onChange={alterar} rows="3" placeholder="Ingredientes e detalhes..." className={`${campoClasse} resize-none`} />
          </Campo>

          <div className="flex gap-4">
            <Campo rotulo="Preço (R$)" largura="w-1/2">
              <input required type="number" min="0.01" step="0.01" name="preco_unitario" value={formulario.preco_unitario} onChange={alterar} className={campoClasse} />
            </Campo>
            <Campo rotulo="Categoria" largura="w-1/2">
              <select required name="categoria_id" value={formulario.categoria_id} onChange={alterar} className={campoClasse}>
                <option value="">Selecione...</option>
                {categorias.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </Campo>
          </div>

          {tipoCategoria === "PRATO" && <CamposPrato formulario={formulario} onChange={alterar} />}
          {tipoCategoria === "BEBIDA" && <CamposBebida formulario={formulario} onChange={alterar} />}

          <label className="flex items-center gap-3 mt-1 font-bold cursor-pointer text-header">
            <input type="checkbox" name="disponivel" checked={formulario.disponivel} onChange={alterar} className="w-5 h-5 cursor-pointer accent-hover" />
            Produto Disponível para Venda?
          </label>

          <div className="flex justify-end gap-4 mt-2 pt-4 border-t border-header/10">
            <button type="button" onClick={onFechar} className="bg-white text-header px-6 py-3 rounded-md font-bold hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="bg-hover text-header px-6 py-3 rounded-md font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer">
              {produto ? "Atualizar Produto" : "Salvar Produto"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
