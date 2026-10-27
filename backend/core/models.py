from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint
from django.contrib.auth.models import AbstractUser, BaseUserManager
# Create your models here.

class GerenteManager(BaseUserManager):
    def create_user(self, cpf, password=None, **extra_fields):
        if not cpf:
            raise ValueError("O CPF é obrigatório.")

        gerente = self.model(cpf=cpf, **extra_fields)
        gerente.set_password(password)
        gerente.save(using=self._db)
        return gerente

    def create_superuser(self, cpf, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superusuário precisa ter is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superusuário precisa ter is_superuser=True.")

        return self.create_user(cpf, password, **extra_fields)

class Gerente(AbstractUser):
    id = models.BigAutoField(primary_key=True)  # id_gerente
    data_efetivacao = models.DateTimeField(auto_now_add=True)
    salario = models.DecimalField(max_digits=10, decimal_places=2)
    nome = models.CharField(max_length=50)
    cpf = models.CharField(max_length=11, unique=True)
    tel = models.CharField(max_length=15, unique=True)
    username = None
    USERNAME_FIELD = "cpf"
    REQUIRED_FIELDS = ["nome", "tel", "salario"]

    objects = GerenteManager()
    
    class Meta:
        db_table = 'gerente'
        ordering = ['nome']
        constraints = [
            CheckConstraint(check=Q(salario__gte=0), name='gerente_salario_nao_negativo'),
        ]

    def __str__(self):
        return self.nome





class Garcom(models.Model):
    id = models.BigAutoField(primary_key=True)  # id_garcom~
    data_efetivacao = models.DateTimeField(auto_now_add=True)
    nome = models.CharField(max_length=50)
    tel = models.CharField(max_length=15, unique=True)
    cpf = models.CharField(max_length=11, unique=True)
    salario = models.DecimalField(max_digits=10, decimal_places=2)
    gerente = models.ForeignKey(
        Gerente,
        on_delete=models.PROTECT,
        related_name='garcons',
        db_column='id_gerente',  
    )

    class Meta:
        db_table = 'garcom'
        ordering = ['nome']
        constraints = [
            CheckConstraint(check=Q(salario__gte=0), name='garcom_salario_nao_negativo'),
        ]

    def __str__(self):
        return self.nome


class Mesa(models.Model):
    id = models.BigAutoField(primary_key=True)  # id_mesa
    ativo = models.BooleanField(default=True)
    capacidade = models.PositiveIntegerField()
    gerente = models.ForeignKey(
        Gerente,
        on_delete=models.PROTECT,
        related_name='mesas',
        db_column='id_gerente',
    )
    garcom = models.ForeignKey(
        Garcom,
        on_delete=models.PROTECT,
        related_name='mesas',
        db_column='id_garcom',
    )

    class Meta:
        db_table = 'mesa'
        ordering = ['id']
        indexes = [
            models.Index(fields=['gerente', 'ativo']),
            models.Index(fields=['garcom', 'ativo']),
        ]

    def __str__(self):
        return f'Mesa {self.id} ({self.capacidade} lugares)'


class Cozinha(models.Model):
    id = models.BigAutoField(primary_key=True)  # id_cozinha
    nome = models.CharField(max_length=50, default='Principal')

    class Meta:
        db_table = 'cozinha'
        ordering = ['nome']

    def __str__(self):
        return self.nome

class Comanda(models.Model):
    id = models.BigAutoField(primary_key=True)
    cpf = models.CharField(max_length=11)
    telefone = models.CharField(max_length=15)
    ativa = models.BooleanField(default=True)
    data_abertura = models.DateTimeField(auto_now_add=True)
    mesa = models.ForeignKey(
        Mesa,
        on_delete=models.PROTECT,
        related_name='comandas',
        db_column='id_mesa',
    )

    class Meta:
        db_table = 'comanda'
        ordering = ['-data_abertura']

        # A abertura valida a comanda ativa com a mesa bloqueada na transação.
        # MySQL não suporta UniqueConstraint com condition.


    def __str__(self):
        return f'Comanda #{self.id} -Mesa {self.mesa_id}'

class Pedido(models.Model):
    id = models.BigAutoField(primary_key=True)  # id_pedido
    concluido = models.BooleanField(default=False)
    data_pedido = models.DateTimeField(auto_now_add=True)
    comanda = models.ForeignKey(
        Comanda,
        on_delete=models.PROTECT,
        related_name='pedidos',
        db_column='id_comanda',
    )

    # No banco, id da cozinha n pode ser null
    cozinha = models.ForeignKey(
        Cozinha,
        on_delete=models.PROTECT,
        related_name='pedidos',
        db_column='id_cozinha',
    )

    class Meta:
        db_table = 'pedido'
        ordering = ['-data_pedido']
        indexes = [
            models.Index(fields=['comanda', 'concluido']),
            models.Index(fields=['cozinha', 'concluido']),
        ]

    def __str__(self):
        return f'Pedido #{self.id} - Comanda {self.comanda_id}'


class Categoria(models.Model):
    class TipoCategoria(models.TextChoices):
        PRATO = 'PRATO', 'Prato'
        BEBIDA = 'BEBIDA', 'Bebida'

    id = models.BigAutoField(primary_key=True)  # id_categoria
    nome = models.CharField(max_length=50, unique=True)
    tipo_categoria = models.CharField(
        max_length=10,
        choices=TipoCategoria.choices,
    )

    class Meta:
        db_table = 'categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Item(models.Model):
    class PontoCarne(models.TextChoices):
        MAL_PASSADO = 'MAL PASSADO', 'Mal Passado'
        NO_PONTO = 'NO PONTO', 'No Ponto'
        BEM_PASSADO = 'BEM PASSADO', 'Bem Passado'

    id = models.BigAutoField(primary_key=True)  # id_item
    nome = models.CharField(max_length=50)
    descricao = models.TextField(blank=True, default='')
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    disponivel = models.BooleanField(default=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='itens',
        db_column='id_categoria',
    )
    gerente = models.ForeignKey(
        Gerente,
        on_delete=models.PROTECT,
        related_name='itens',
        db_column='id_gerente',
    )
    imagem = models.ImageField(upload_to='itens/', blank=True, default='itens/default.png')  

    # Atributos de Prato (null/blank para bebidas)
    peso = models.FloatField(null=True, blank=True)
    tempo_preparo_minutos = models.PositiveIntegerField(null=True, blank=True)
    ponto_carne = models.CharField(
        max_length=20,
        choices=PontoCarne.choices,
        null=True,
        blank=True,
    )

    # Atributos de Bebida (null/blank para pratos)
    teor_alcoolico = models.FloatField(null=True, blank=True)
    volume_ml = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'item'
        ordering = ['nome']
        constraints = [
            CheckConstraint(check=Q(preco_unitario__gt=0), name='item_preco_positivo'),
            # Validação condicional simples no banco (opcional, mais forte no clean/save)
        ]
        indexes = [
            models.Index(fields=['gerente']),
        ]

    def __str__(self):
        return f'{self.nome} ({self.categoria.nome})'

    def clean(self):
        from django.core.exceptions import ValidationError
        super().clean()
        # A validação do campo já informa se a categoria está ausente ou é inválida.
        try:
            categoria = self.categoria
        except Categoria.DoesNotExist:
            return

        if categoria.tipo_categoria == Categoria.TipoCategoria.PRATO:
            if self.peso is None:
                raise ValidationError({'peso': 'Peso é obrigatório para pratos.'})
            if self.tempo_preparo_minutos is None:
                raise ValidationError({'tempo_preparo_minutos': 'Tempo de preparo é obrigatório para pratos.'})
            # Bebida fields devem ser None
            self.teor_alcoolico = None
            self.volume_ml = None
        elif categoria.tipo_categoria == Categoria.TipoCategoria.BEBIDA:
            if self.teor_alcoolico is None:
                raise ValidationError({'teor_alcoolico': 'Teor alcoólico é obrigatório para bebidas.'})
            if self.volume_ml is None:
                raise ValidationError({'volume_ml': 'Volume (ml) é obrigatório para bebidas.'})
            # Prato fields devem ser None
            self.peso = None
            self.tempo_preparo_minutos = None
            self.ponto_carne = None

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ItensPedido(models.Model):
    """Tabela intermediária Pedido ↔ Item com campos extras."""

    class Status(models.TextChoices):
        EM_PREPARO = 'EM_PREPARO', 'Em preparo'
        PRONTO = 'PRONTO', 'Pronto'
        ENTREGUE = 'ENTREGUE', 'Entregue'

    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        related_name='itens_pedido',
        db_column='id_item',
    )
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name='itens_pedido',
        db_column='id_pedido',
    )
    preco = models.DecimalField(max_digits=10, decimal_places=2)  # preço no momento do pedido
    quantidade = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.EM_PREPARO,)

    class Meta:
        db_table = 'itens_pedido'
        constraints = [
            CheckConstraint(check=Q(preco__gt=0), name='itens_pedido_preco_positivo'),
            CheckConstraint(check=Q(quantidade__gt=0), name='itens_pedido_qtd_positiva'),
        ]
        indexes = [
            models.Index(fields=['pedido']),
            models.Index(fields=['item']),
        ]

    def __str__(self):
        return f'{self.quantidade}x {self.item} no Pedido #{self.pedido_id}'


class Promocao(models.Model):
    id = models.BigAutoField(primary_key=True)  # id_promocao
    desconto_percentual = models.FloatField()  # ex: 10.0 para 10%
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    descricao = models.TextField(blank=True, default='')
    gerente = models.ForeignKey(
        Gerente,
        on_delete=models.PROTECT,
        related_name='promocoes',
        db_column='id_gerente',
    )

    class Meta:
        db_table = 'promocao'
        ordering = ['-data_inicio']
        constraints = [
            CheckConstraint(
                check=Q(data_fim__gt=models.F('data_inicio')),
                name='promocao_data_fim_apos_inicio',
            ),
        ]

    def __str__(self):
        return f'Promoção #{self.id} ({self.desconto_percentual}%)'


class ItensPromocao(models.Model):
    """Tabela intermediária Item ↔ Promocao com data."""
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='itens_promocao',
        db_column='id_item',
    )
    promocao = models.ForeignKey(
        Promocao,
        on_delete=models.CASCADE,
        related_name='itens_promocao',
        db_column='id_promocao',
    )
    data = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'itens_promocao'
        constraints = [
            UniqueConstraint(fields=['item', 'promocao'], name='unique_item_promocao'),
        ]
        indexes = [
            models.Index(fields=['promocao']),
            models.Index(fields=['item']),
        ]

    def __str__(self):
        return f'{self.item} na {self.promocao}'


