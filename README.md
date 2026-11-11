# Discipulado JNI União

App de discipulado (10 encontros) publicado no GitHub Pages, com dados e login no Supabase.

## Publicar (GitHub Pages + Supabase)

1. **Banco:** no SQL Editor do Supabase (https://supabase.com/dashboard/project/ttauxxhosrhcvhtwltpv/sql/new), cole e rode o arquivo `supabase/schema.sql` inteiro.
2. **Códigos e e-mail do ADM:** no mesmo SQL Editor, troque os valores padrão (todos `JNIconexao` no início) e o e-mail do administrador:
   ```sql
   update public.config set valor = 'NOVO_CODIGO' where chave = 'codigo_discipulador';
   update public.config set valor = 'NOVO_CODIGO' where chave = 'codigo_acesso';
   update public.config set valor = 'seu@email.com' where chave = 'email_admin';
   ```
   O administrador é a conta criada com esse e-mail.
3. **Cadastro sem confirmação de e-mail:** em Authentication > Sign In / Providers > Email, desative *Confirm email*. Sem isso, a conta só entra depois de confirmar o e-mail.
4. **Pages:** em Settings > Pages do repositório, escolha *Source: GitHub Actions*. Cada push na `main` publica a pasta `public/`.
5. O endereço fica em `https://viniciusliniker1-spec.github.io/discipulado-jni-uniao/`. No celular, abra no Chrome/Safari e escolha *Adicionar à tela inicial*.

A chave publicável do Supabase fica em `public/config.js`. Ela não dá acesso aos dados: quem protege os dados são as regras de acesso (RLS) do `schema.sql`.

## Versão com servidor Node (só para testes locais)

A pasta raiz tem um servidor Node (`server.js`) com a mesma lógica, mas em arquivo JSON. Ele não é usado na publicação; mantenha-o apenas para testes locais.

# Manual do Discipulado · JNI União

App para cursar (discípulo) e ministrar (discipulador) os 10 encontros do Discipulado individual.
Sem dependências externas: basta Node.js 18 ou superior.

## Rodar

```bash
INVITE_CODE="JNIconexao" ACCESS_CODE="JNIconexao" ADMIN_EMAIL="seu@email.com" node server.js
```

Abra http://localhost:3000

- `INVITE_CODE`: código que você (administrador) passa ao discipulador. Sem ele, ninguém cria conta de discipulador. O padrão é `JNIconexao`: **troque em produção**.
- `ACCESS_CODE`: código que o administrador digita na própria conta (tela Administração) para liberar a versão completa, com as funções de discípulo e de discipulador. Padrão `JNIconexao`: **troque em produção**.
- `ADMIN_EMAIL`: o e-mail que vira perfil de administração. Crie a conta com esse e-mail no próprio app.
- `PORT` (opcional): porta do servidor, padrão 3000.

## Versão completa e modos

A conta de administrador vê a administração. Depois de digitar o `ACCESS_CODE` na tela Administração, aparecem os modos **Discípulo**, **Discipulador** e **Administração** no topo. Discipulador também alterna entre Discípulo e Discipulador. A escolha fica salva no navegador.

## Instalar no celular

Abra o endereço do app no navegador do celular e escolha "Adicionar à tela inicial". O ícone é o símbolo da JNI com "DISCIPULADO".

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

## Hospedagem e dados

O progresso fica salvo no servidor, em `data/db.json`, e vale para cada conta. Para que ele fique disponível de qualquer aparelho, o app precisa estar hospedado em um servidor com disco persistente (ex.: Render, Railway ou VPS).

## Dados

As contas e os registros ficam em `data/db.json`. Faça cópia de segurança desse arquivo. Para produção, considere migrar para um banco de dados e usar HTTPS.

## Estrutura

- `server.js`: servidor HTTP, autenticação, regras de privacidade, Google OAuth.
- `public/content.js`: conteúdo dos 10 encontros (discípulo e discipulador), links da NVI no YouVersion.
- `public/app.js`: interface (login, encontros, registro, notas, administração, ritmo).
- `public/style.css`: identidade visual JNI União.

## Versículos

Cada texto abre a NVI (Português, Brasil) no YouVersion, no versículo indicado. A NVI usa o código de versão `129` no YouVersion. Confirme abrindo um link pelo celular com o app instalado. Se o app não abrir direto, o link leva ao site.
