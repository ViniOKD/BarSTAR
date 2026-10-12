from django.contrib import admin
from .models import Item, Categoria, Gerente

# Register your models here.

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'preco_unitario', 'disponivel')
    list_editable = ('disponivel',)
    list_filter = ('disponivel', 'categoria')
    search_fields = ('nome',)


admin.site.register(Categoria)
admin.site.register(Gerente)

