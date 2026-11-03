"""Compartilha o cardápio de demonstração e associa suas fotos versionadas."""

from decimal import Decimal

from django.db import migrations
from django.db.models import Q


FOTOS = {
    'Heineken 600ml': 'itens/heineken.jpg',
    'Stella Artois 600ml': 'itens/stella_artois.jpg',
    'Caipirinha de Limão': 'itens/caipirinha_limão.jpeg',
    'Mojito': 'itens/mojito.jpg',
    "Whisky Jack Daniel's (dose 50ml)": 'itens/jack_daniels.jpg',
}

# Snapshot independente dos modelos atuais e das migrações anteriores.
PRODUTOS = [
    # --- BEBIDAS ---
    {
        'nome': 'Heineken 600ml',
        'descricao': 'Cerveja lager premium holandesa',
        'preco_unitario': Decimal('14.90'),
        'categoria': 'Cervejas',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 5.0,
        'volume_ml': 600,
    },
    {
        'nome': 'Stella Artois 600ml',
        'descricao': 'Cerveja belga tipo pilsen',
        'preco_unitario': Decimal('16.90'),
        'categoria': 'Cervejas',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 5.2,
        'volume_ml': 600,
    },
    {
        'nome': 'Caipirinha de Limão',
        'descricao': 'Cachaça, limão, açúcar e gelo',
        'preco_unitario': Decimal('18.00'),
        'categoria': 'Drinks',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 20.0,
        'volume_ml': 200,
    },
    {
        'nome': 'Mojito',
        'descricao': 'Rum, hortelã, limão, açúcar, água com gás',
        'preco_unitario': Decimal('22.00'),
        'categoria': 'Drinks',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 15.0,
        'volume_ml': 250,
    },
    {
        'nome': 'Whisky Jack Daniel\'s (dose 50ml)',
        'descricao': 'Whisky Tennessee americano',
        'preco_unitario': Decimal('28.00'),
        'categoria': 'Destilados',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 40.0,
        'volume_ml': 50,
    },
    {
        'nome': 'Refrigerante Lata 350ml',
        'descricao': 'Coca-Cola, Guaraná ou Sprite',
        'preco_unitario': Decimal('6.00'),
        'categoria': 'Não Alcoólicos',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 0.0,
        'volume_ml': 350,
    },
    {
        'nome': 'Suco Natural 300ml',
        'descricao': 'Laranja, maracujá ou abacaxi',
        'preco_unitario': Decimal('8.00'),
        'categoria': 'Não Alcoólicos',
        'tipo_categoria': 'BEBIDA',
        'teor_alcoolico': 0.0,
        'volume_ml': 300,
    },
    # --- PETISCOS ---
    {
        'nome': 'Batata Frita Grande',
        'descricao': 'Porção de batatas fritas crocantes com molho da casa',
        'preco_unitario': Decimal('28.00'),
        'categoria': 'Petiscos',
        'tipo_categoria': 'PRATO',
        'peso': 350.0,
        'tempo_preparo_minutos': 12,
    },
    {
        'nome': 'Pastel de Carne (6 unid.)',
        'descricao': 'Pastéis fritos na hora, recheio de carne moída temperada',
        'preco_unitario': Decimal('24.00'),
        'categoria': 'Petiscos',
        'tipo_categoria': 'PRATO',
        'peso': 300.0,
        'tempo_preparo_minutos': 10,
    },
    {
        'nome': 'Calabresa Acebolada',
        'descricao': 'Linguiça calabresa grelhada com cebolas e pimentões',
        'preco_unitario': Decimal('32.00'),
        'categoria': 'Petiscos',
        'tipo_categoria': 'PRATO',
        'peso': 280.0,
        'tempo_preparo_minutos': 15,
    },
    {
        'nome': 'Bolinho de Bacalhau (8 unid.)',
        'descricao': 'Bolinhos crocantes de bacalhau desfiado',
        'preco_unitario': Decimal('38.00'),
        'categoria': 'Petiscos',
        'tipo_categoria': 'PRATO',
        'peso': 240.0,
        'tempo_preparo_minutos': 12,
    },
    # --- PRATOS PRINCIPAIS ---
    {
        'nome': 'Picanha na Chapa',
        'descricao': 'Picanha grelhada, arroz, feijão, farofa e vinagrete (serve 2)',
        'preco_unitario': Decimal('89.90'),
        'categoria': 'Pratos Principais',
        'tipo_categoria': 'PRATO',
        'peso': 600.0,
        'tempo_preparo_minutos': 25,
        'ponto_carne': 'NO PONTO',
    },
    {
        'nome': 'Filé à Parmegiana',
        'descricao': 'Filé empanado com molho de tomate e muçarela, arroz e fritas',
        'preco_unitario': Decimal('58.00'),
        'categoria': 'Pratos Principais',
        'tipo_categoria': 'PRATO',
        'peso': 450.0,
        'tempo_preparo_minutos': 20,
        'ponto_carne': 'BEM PASSADO',
    },
    {
        'nome': 'Frango Grelhado com Legumes',
        'descricao': 'Pechito de frango grelhado, legumes salteados e purê de batata',
        'preco_unitario': Decimal('42.00'),
        'categoria': 'Pratos Principais',
        'tipo_categoria': 'PRATO',
        'peso': 400.0,
        'tempo_preparo_minutos': 18,
        'ponto_carne': 'BEM PASSADO',
    },
    {
        'nome': 'Salmão Grelhado',
        'descricao': 'Filé de salmão grelhado, risoto de limão siciliano e aspargos',
        'preco_unitario': Decimal('72.00'),
        'categoria': 'Pratos Principais',
        'tipo_categoria': 'PRATO',
        'peso': 350.0,
        'tempo_preparo_minutos': 22,
        'ponto_carne': 'NO PONTO',
    },
    # --- SOBREMESAS ---
    {
        'nome': 'Petit Gateau com Sorvete',
        'descricao': 'Bolo de chocolate quente com centro derretido e sorvete de creme',
        'preco_unitario': Decimal('22.00'),
        'categoria': 'Sobremesas',
        'tipo_categoria': 'PRATO',
        'peso': 180.0,
        'tempo_preparo_minutos': 8,
    },
    {
        'nome': 'Pudim de Leite Condensado',
        'descricao': 'Pudim caseiro com calda de caramelo',
        'preco_unitario': Decimal('14.00'),
        'categoria': 'Sobremesas',
        'tipo_categoria': 'PRATO',
        'peso': 150.0,
        'tempo_preparo_minutos': 5,
    },
]


def cadastrar_produtos(apps, schema_editor):
    banco = schema_editor.connection.alias
    Item = apps.get_model('core', 'Item')
    Categoria = apps.get_model('core', 'Categoria')
    Gerente = apps.get_model('core', 'Gerente')
    itens = Item.objects.using(banco)
    categorias = Categoria.objects.using(banco)
    gerentes = Gerente.objects.using(banco)
    gerente = None

    for produto in PRODUTOS:
        nome = produto['nome']
        if not itens.filter(nome=nome).exists():
            if gerente is None:
                gerente = gerentes.order_by('pk').first()
                if gerente is None:
                    gerente = gerentes.create(
                        cpf='12345678901', nome='Carlos Gerente',
                        tel='11999998888', salario=Decimal('8500.00'),
                        password='!', is_staff=False, is_superuser=False,
                    )
            dados = dict(produto)
            categoria, _ = categorias.get_or_create(
                nome=dados.pop('categoria'),
                defaults={'tipo_categoria': dados.pop('tipo_categoria')},
            )
            itens.create(
                **dados, categoria=categoria, gerente=gerente,
                imagem=FOTOS.get(nome, 'itens/default.png'),
                disponivel=True,
            )

        # Não sobrescrever uploads, preços ou disponibilidade já personalizados.
        if nome in FOTOS:
            itens.filter(nome=nome).filter(
                Q(imagem='') | Q(imagem='itens/default.png'),
            ).update(imagem=FOTOS[nome])


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0010_gerente_autenticacao'),
    ]

    operations = [
        # Não apagar dados no rollback: os itens podem estar em pedidos.
        migrations.RunPython(cadastrar_produtos, migrations.RunPython.noop),
    ]
