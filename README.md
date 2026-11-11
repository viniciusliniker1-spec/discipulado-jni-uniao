# Manual do Discipulado · JNI União

App para cursar (discípulo) e ministrar (discipulador) os 10 encontros do Discipulado individual.
Sem dependências externas: basta Node.js 18 ou superior.

## Rodar

```bash
INVITE_CODE="código-que-você-escolher" ADMIN_EMAIL="seu@email.com" node server.js
```

Abra http://localhost:3000

- `INVITE_CODE`: código que você (administrador) passa ao discipulador. Sem ele, ninguém cria conta de discipulador.
- `ADMIN_EMAIL`: o e-mail que vira perfil de administração. Crie a conta com esse e-mail no próprio app.
- `PORT` (opcional): porta do servidor, padrão 3000.

## Quem vê o quê

| Dado | Discípulo | Discipulador designado | Administrador |
|---|---|---|---|
| Respostas, registro do discípulo, dias do desafio, compromisso | sim | sim | **não** |
| Notas privadas do discipulador | não | sim (só ele) | não |
| Designar discipulador a um discípulo | não | não | sim |

O servidor aplica essas regras em cada requisição (`server.js`, funções `podeVerAluno` e as rotas de notas).

## Login com Google (configurar depois)

1. No Google Cloud Console, crie um cliente OAuth do tipo "Aplicativo da Web".
2. Adicione o URI de redirecionamento: `BASE_URL/auth/google/callback` (ex.: `https://seu-dominio.com/auth/google/callback`).
3. Rode o servidor com:

```bash
GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..." BASE_URL="https://seu-dominio.com" INVITE_CODE="..." ADMIN_EMAIL="..." node server.js
```

Enquanto as chaves não existirem, o botão "Continuar com Google" fica desativado e o login por e-mail e senha funciona normalmente.

## Dados

As contas e os registros ficam em `data/db.json`. Faça cópia de segurança desse arquivo. Para produção, considere migrar para um banco de dados e usar HTTPS.

## Estrutura

- `server.js`: servidor HTTP, autenticação, regras de privacidade, Google OAuth.
- `public/content.js`: conteúdo dos 10 encontros (discípulo e discipulador), links da NVI no YouVersion.
- `public/app.js`: interface (login, encontros, registro, notas, administração, ritmo).
- `public/style.css`: identidade visual JNI União.

## Versículos

Cada texto abre a NVI (Português, Brasil) no YouVersion, no versículo indicado. A NVI usa o código de versão `129` no YouVersion. Confirme abrindo um link pelo celular com o app instalado. Se o app não abrir direto, o link leva ao site.
