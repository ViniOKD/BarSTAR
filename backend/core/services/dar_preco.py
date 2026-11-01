def calcular_preco_final(preco_original, desconto_percentual):
    original = float(preco_original)
    percentual = float(desconto_percentual)

    if original <= 0:
        raise ValueError("Preço normal inválido.")

    if not 0 < percentual < 100:
        raise ValueError("O percentual deve ser maior que zero e menor que 100.")

    final = round(original * (1 - percentual / 100), 2)

    if not 0 < final < original:
        raise ValueError("O desconto não produz um preço promocional válido.")

    return final