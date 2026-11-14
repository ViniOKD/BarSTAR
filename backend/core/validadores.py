import re

from rest_framework import serializers


def calcular_digito_cpf(digitos, peso_inicial):
    # Cada dígito verificador é calculado a partir dos dígitos anteriores.
    soma = 0
    for posicao in range(peso_inicial - 1):
        soma += digitos[posicao] * (peso_inicial - posicao)

    resto = soma % 11
    if resto < 2:
        return 0
    return 11 - resto


def validar_cpf(valor):
    # Retorna o CPF só com números, ou gera erro de validação.
    numeros = re.sub(r'\D', '', valor)

    if len(numeros) != 11:
        raise serializers.ValidationError("O CPF informado é inválido. Digite os 11 dígitos.")

    # CPFs com todos os dígitos iguais passam no cálculo, mas não existem.
    if numeros == numeros[0] * 11:
        raise serializers.ValidationError("O CPF informado é inválido.")

    digitos = [int(numero) for numero in numeros]

    if digitos[9] != calcular_digito_cpf(digitos, 10):
        raise serializers.ValidationError("O CPF informado é inválido.")

    if digitos[10] != calcular_digito_cpf(digitos, 11):
        raise serializers.ValidationError("O CPF informado é inválido.")

    return numeros


def validar_telefone(valor):
    # Retorna o telefone só com números, ou gera erro de validação.
    numeros = re.sub(r'\D', '', valor)

    if len(numeros) < 10:
        raise serializers.ValidationError("O número de telefone informado é inválido. Inclua o DDD.")

    return numeros
