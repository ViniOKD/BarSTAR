from django.contrib import admin
from .models import Item, Categoria, Gerente

# Register your models here.

admin.site.register(Item)
admin.site.register(Categoria)
admin.site.register(Gerente)

