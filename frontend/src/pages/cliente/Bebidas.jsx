import CardapioProdutos from "../../components/cliente/CardapioProdutos";

export default function Comidas({
  onAdicionarItem,
  itemEmEdicao,
  onAtualizarItem,
  onCancelarEdicao,
}) {
  return (
    <CardapioProdutos
      tipoCategoria="BEBIDA"
      nomePagina="bebidas"
      onAdicionarItem={onAdicionarItem}
      itemEmEdicao={itemEmEdicao}
      onAtualizarItem={onAtualizarItem}
      onCancelarEdicao={onCancelarEdicao}
    />
  );
}