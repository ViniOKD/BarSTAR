FROM python:3.13-slim-bookworm

# evita a criação de arquivos cache .pyc
ENV PYTHONDONTWRITEBYTECODE=1

# mostra as mensagens de log em tempo real
ENV PYTHONUNBUFFERED=1

# define a pasta de trabalho
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        default-libmysqlclient-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# copia e instala as dependências do projeto
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copia o código do backend para o container
COPY . .

# indicação de qual porta será usada pelo Django
EXPOSE 8000

# incialização do servidor de desenvolvimento
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
# equivalente a python manage.py runserver 0.0.0.0:8000