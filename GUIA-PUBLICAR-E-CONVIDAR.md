# Pasta da Prova — publicar, convidar e cuidar do app

**Endereço do app:** https://pasta-da-prova.vercel.app

---

## 1. Como o app está montado (resumo)

| Peça | Serviço (grátis) | Para quê |
|---|---|---|
| Código | GitHub — `guimilititinha3734-creator/pasta-da-prova` | Guarda o código |
| Site | Vercel — projeto `pasta-da-prova` | Coloca o app no ar |
| Banco, login e arquivos | Supabase — `fyqlmmihrtlrxhaxaipz` | Turmas, provas, fotos, PDFs, contas |
| Login com Google | Google Cloud — "My First Project" | Botão "Entrar com Google" |

Nada disso tem cartão cadastrado. Se algum limite for atingido, o serviço **para**, não cobra.

---

## 2. Convidar os amigos

1. Entre no app e abra a sua turma.
2. Toque em **Convidar amigos** (no celular abre o WhatsApp/compartilhar; no PC copia a mensagem).
3. A mensagem leva o **link do app** + o **código da turma** (ex.: `DIR-ETQX`).
4. O amigo abre o link → **Entrar com Google** → **Entrar com código** → pronto.

Dicas:
- Para provas só de um grupo: crie o grupo, e **quem já é do grupo** adiciona os colegas pelo botão "+ Adicionar".
- Se o código vazar para quem não devia: na página da turma (admin), **Gerar novo código de convite**. O antigo para de funcionar.
- Peça para cada um tocar no avatar (canto superior direito) e conferir o **nome** que aparece.

---

## 3. Instalar no celular (PWA)

**Android (Chrome):**
1. Abra https://pasta-da-prova.vercel.app no Chrome.
2. Menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
3. Aparece o ícone vinho com **§** na tela do celular.

**iPhone (Safari — tem que ser o Safari):**
1. Abra o link no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta para cima).
3. **Adicionar à Tela de Início** → **Adicionar**.

---

## 4. Limites do plano grátis (e o que fazer)

| Limite | Valor | O que acontece / o que fazer |
|---|---|---|
| Arquivos (Supabase) | **1 GB no total**, dividido em **200 MB por turma** (até 5 turmas) | Cada turma vê a própria barra "Espaço da turma". Turmas criadas depois que o 1 GB foi distribuído ficam com 0 (só anotações e links) até você aumentar a cota delas. Comandos prontos no fim de `supabase/03_espaco_por_turma.sql`. |
| Tamanho por arquivo | vídeo 25 MB · PDF 20 MB | O app avisa antes de enviar. Vídeos maiores → YouTube (não listado) ou Google Drive. |
| E-mails de link mágico | ~2 por hora (app inteiro) | Use **Entrar com Google**. |
| Tráfego (Supabase) | ~5 GB/mês | Vídeos enviados gastam mais; links não gastam. |
| Supabase parado | pausa após **7 dias sem nenhum acesso** | Entre em supabase.com → projeto → **Restore**. Durante o semestre não acontece. |
| Vercel (Hobby) | uso pessoal/não comercial | Perfeito para a turma. |

---

## 5. Atualizar o app depois de mudar o código

Toda vez que o código é enviado ao GitHub, a **Vercel publica sozinha** em 1–2 minutos.

```
git add -A
git commit -m "descreva a mudança"
git push
```

Se mudar algo no banco (arquivos em `supabase/`), rode o SQL no **SQL Editor** do Supabase.

## 6. Rodar no seu computador (para testar mudanças)

```
npm run dev
```
e abra http://localhost:3000 (precisa do arquivo `.env.local` com as chaves — ele NÃO vai para o GitHub).

---

## 7. Se algo der errado

- **"provider is not enabled"** → Google desligado no Supabase (Authentication → Sign In / Providers → Google).
- **Login volta para localhost** → Supabase → Authentication → URL Configuration: Site URL = `https://pasta-da-prova.vercel.app` e Redirect URL `https://pasta-da-prova.vercel.app/**`.
- **"Muitos e-mails enviados"** → limite do link mágico; use Google.
- **Página "não encontrada" 🔒** → a pessoa não é da turma/grupo (é a segurança funcionando).
- **Site fora do ar** → veja o painel da Vercel (aba Deployments) ou se o Supabase foi pausado.
