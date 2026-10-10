# BARStar

## Tecnologias

- React + Vite
- Python + Django
- MySQL
- Docker Compose

## Pré-requisitos

- Git
- Docker com Docker Compose

Confira se o Docker está disponível:

```bash
docker --version
docker compose version
docker info
```

Com Docker, não é necessário instalar Python, Node.js ou MySQL
na máquina para executar o projeto.

## Primeira execução

Clone o repositório e entre na pasta criada:

```bash
git clone <URL_DO_REPOSITORIO>
cd BarSTAR
```

Se a pasta tiver outro nome, ajuste o comando `cd`.

Crie a configuração local:

```bash
cp .env.example .env
```

O `.env.example` contém valores para desenvolvimento local.
O arquivo `.env` não deve ser commitado.

Construa as imagens e inicie os serviços:

```bash
docker compose up --build -d
```

Confira os containers:

```bash
docker compose ps
```

Com o backend em execução, verifique o Django e crie as tabelas:

```bash
docker compose exec backend python manage.py check
docker compose exec backend python manage.py migrate
```

## Acessos

| Serviço | Endereço |
| --- | --- |
| Frontend | http://localhost:5173 |
| API de verificação | http://localhost:8000/api/health/ |
| Administração Django | http://localhost:8000/admin/ |

A página inicial consulta a API, que executa uma consulta no MySQL.
Quando a integração funciona, aparece:

> React, Django e MySQL conectados

Para acessar a administração, crie um usuário:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Comandos úteis

Iniciar os serviços:

```bash
docker compose up -d
```

Parar os serviços:

```bash
docker compose down
```

Consultar os logs:

```bash
docker compose logs -f backend frontend db
```

Pressione Ctrl+C para sair dos logs. Isso não encerra os containers.

Reconstruir as imagens após alterar Dockerfiles ou dependências:

```bash
docker compose up --build -d
```

Verificar o frontend:

```bash
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

## Alterações no banco

Após modificar os modelos, gere as migrações.
No Linux, informe seu usuário para evitar arquivos pertencentes ao root:

```bash
docker compose exec --user "$(id -u):$(id -g)" backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

As migrações devem ser versionadas no Git.

Após receber alterações da equipe:

```bash
git pull
docker compose up --build -d
docker compose exec backend python manage.py migrate
```

## Organização

- `frontend/`: interface React e configuração do Vite.
- `backend/`: projeto Django e suas aplicações.
- `compose.yaml`: serviços e volumes do ambiente.
- `.env.example`: exemplo das variáveis necessárias.

O código local é compartilhado com os containers, permitindo
editar pelo editor e visualizar as mudanças durante o desenvolvimento.

Cada desenvolvedor tem seu próprio banco local.
Os dados do MySQL ficam em um volume Docker.

## Documentação da API (OpenAPI / Swagger / ReDoc)

Este projeto usa **[drf-spectacular](https://drf-spectacular.readthedocs.io/)** para gerar a especificação OpenAPI 3.1 automaticamente a partir do código Django REST Framework.

Swagger UI (interativo)
http://localhost:8000/api/docs/
- Testa endpoints direto no browser
- Autenticação via token (se configurado)
- Mostra request/response examples


ReDoc (documentação limpa)
http://localhost:8000/api/redoc/
- Visualização apenas para leitura
- Melhor para compartilhar com frontend/mobile
- Busca, navegação por tags, modelos expansíveis

## Observações

O comando `docker compose down` preserva os dados.
O comando `docker compose down -v` remove os volumes e apaga
os dados locais do MySQL.

As credenciais de inicialização do MySQL são aplicadas quando
o volume está vazio. Alterar apenas o `.env` não altera as
senhas de um banco já inicializado.

O proxy `/api` está configurado no servidor de desenvolvimento
do Vite. 
