# Guia da Etapa 1 — Login, turmas e grupos

Este guia mostra o que **você** precisa fazer fora do código. Siga na ordem.
Tempo estimado: 20–30 minutos. Nenhum passo pede cartão de crédito.

---

## Parte A — Criar o projeto no Supabase (banco + login)

O Supabase é o "back-end": guarda as contas, as turmas e (na etapa 2) os arquivos.

1. Acesse **https://supabase.com** e clique em **Start your project**.
2. Crie a conta (pode ser com o GitHub ou com e-mail e senha).
3. Clique em **New project** e preencha:
   - **Name:** `pasta-da-prova`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha** num lugar seguro (não vamos usá-la agora, mas é bom ter).
   - **Region:** `South America (São Paulo)` — fica mais rápido para vocês.
   - Plano: **Free**.
4. Clique em **Create new project** e espere uns 2 minutos até ele ficar pronto.

### A1. Criar as tabelas (rodar o SQL)

1. No menu da esquerda, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/01_turmas_grupos.sql` deste projeto, copie **tudo** e cole no editor.
4. Clique em **Run** (ou Ctrl+Enter). Deve aparecer *"Success. No rows returned"*.

> Se der erro dizendo que algo "already exists", é porque o SQL já foi rodado antes. Tudo certo.

### A2. Copiar as duas chaves para o app

1. No Supabase, clique no botão **Connect** (no topo) ou vá em **Project Settings → API Keys**.
2. Você vai precisar de duas coisas:
   - **Project URL** — algo como `https://abcdxyz.supabase.co`
   - **Publishable key** — começa com `sb_publishable_...`
     (em projetos mais antigos ela se chama **anon public key** e começa com `eyJ...`; serve igual)
3. Na pasta do projeto, abra o arquivo **`.env.local`** (já está criado) e troque os valores
   de exemplo pelos seus:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdxyz.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```

> ⚠️ Nunca use a chave **secret** / **service_role** no app. Ela ignora todas as regras de segurança.
> A *publishable* pode ficar no app sem problema: quem protege os dados é o RLS.

### A3. Dizer ao Supabase para onde voltar depois do login

1. Vá em **Authentication → URL Configuration**.
2. **Site URL:** `http://localhost:3000`
3. Em **Redirect URLs**, clique em **Add URL** e adicione: `http://localhost:3000/**`
4. Salve.

Pronto: o **link mágico por e-mail** já funciona (ele vem ligado por padrão).

> 📧 **Limite do e-mail grátis:** o Supabase envia só alguns e-mails por hora. Para testar, ok.
> Se o link der erro, peça outro mais tarde ou use o Google.
> Abra o link **no mesmo navegador** onde você pediu o e-mail, senão ele não funciona.

---

## Parte B — Login com Google (opcional agora, mas recomendado)

Você pode testar só com o link mágico e fazer esta parte depois.

1. No Supabase, vá em **Authentication → Sign In / Providers → Google**.
   Copie o endereço que aparece em **Callback URL (for OAuth)**
   (algo como `https://abcdxyz.supabase.co/auth/v1/callback`). Deixe essa aba aberta.
2. Em outra aba, abra **https://console.cloud.google.com** e entre com sua conta Google.
3. No topo, clique no seletor de projetos → **Novo projeto** → nome `Pasta da Prova` → **Criar**.
4. Com o projeto selecionado, procure no topo por **"Google Auth Platform"** e abra.
   Clique em **Começar / Get started** e preencha:
   - **Nome do app:** `Pasta da Prova`
   - **E-mail de suporte:** o seu
   - **Público (Audience):** **Externo**
   - **Contato:** o seu e-mail → aceite os termos → **Criar**
5. No menu da esquerda, abra **Clientes (Clients)** → **Criar cliente**:
   - **Tipo de aplicativo:** Aplicativo da Web
   - **Nome:** `Supabase`
   - **URIs de redirecionamento autorizados** → **Adicionar URI** → cole a *Callback URL* do passo 1
   - **Criar**
6. Vai aparecer um **ID do cliente** e uma **Chave secreta do cliente**. Copie os dois.
7. Volte à aba do Supabase (Google), ative **Enable Sign in with Google**,
   cole o **Client ID** e o **Client Secret** e clique em **Save**.
8. De volta ao Google, abra **Público (Audience)** e clique em **Publicar app**.
   (Sem isso, só e-mails cadastrados como "usuários de teste" conseguem entrar.
   Como o app só pede nome, e-mail e foto, o Google não exige revisão.)

---

## Parte C — Rodar o app no seu computador

1. Abra a pasta do projeto num terminal (no app do Claude, use a aba de Terminal).
2. Rode:

   ```
   npm run dev
   ```

3. Abra **http://localhost:3000** no navegador.
4. Para parar o app: no terminal, aperte **Ctrl + C**.

---

## O que testar nesta etapa ✅

1. **Entrar** com Google e/ou com o link mágico.
2. **Criar uma turma** — anote o código gerado (ex.: `DIR-7K2P`).
3. Abra uma **janela anônima** (Ctrl+Shift+N), entre com **outro e-mail**
   e use **Entrar com código**. A pessoa nova deve aparecer em "Colegas".
4. **Criar um grupo** e **adicionar** a outra conta pelo botão "+ Adicionar".
5. **Teste de segurança:** com uma terceira conta que NÃO entrou na turma, cole na barra
   de endereço o link da turma (`http://localhost:3000/turmas/...`).
   Deve aparecer "Página não encontrada" 🔒 — é o RLS funcionando.
6. Sair da turma / sair do grupo / apagar grupo.

Encontrou algo estranho? Me mande o print ou o texto do erro.
