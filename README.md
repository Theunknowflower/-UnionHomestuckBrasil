# UnionHomestuckBrasil — ORION (pacote final)

**Descrição curta:** este pacote contém a versão atualizada do frontend do projeto *UnionHomestuckBrasil* com comentários ricos (texto, imagens/GIFs via URL), integração com Supabase Auth (Discord OAuth), e políticas RLS preparadas para segurança.

---

## Conteúdo do pacote
- `index.html` — entrada principal (GitHub Pages ready)
- `assets/css/style.css` — estilos mínimos e responsivo
- `assets/js/script.js` — lógica de autenticação, posts, comentários (com preview de mídia)
- `supabase_schema.sql` — SQL para criar/ajustar tabelas, trigger e policies
- `README.md` — este arquivo

---

## Passo a passo (detalhado) — Preparar Supabase e GitHub Pages

> Faça tudo com calma; siga os passos na ordem.

### 1) Criar projeto no Supabase
1. Acesse https://app.supabase.com e crie um novo projeto.
2. Anote os valores: **Project URL** e **anon public key** (Settings → API). Vai usar no `index.html` ou via variáveis de ambiente do GitHub Pages (recomendado).

### 2) Rodar o SQL (tabelas, trigger, policies)
1. No Supabase → SQL Editor, cole o arquivo `supabase_schema.sql` e execute.
2. Isso cria/ajusta `profiles`, `posts`, `comments`, trigger `handle_new_user` e policies RLS descritas no arquivo.

### 3) Configurar Discord OAuth (Auth provider)
1. Vá ao Discord Developer Portal: https://discord.com/developers/applications → crie uma app (ou use existente) → OAuth2 → Redirects.
2. Adicione as URLs exatas (substitua pelo seu domínio):
   - `https://theunknowflower.github.io/UnionHomestuckBrasil`
   - `https://theunknowflower.github.io/UnionHomestuckBrasil/`
3. No Supabase → Authentication → Providers → habilite **Discord** e cole **Client ID** e **Client Secret** do Discord app.
4. Em "Redirect URLs" no Supabase Auth, adicione os mesmos links do passo 2.

### 4) Ajustar as chaves no frontend
No `index.html` há um bloco no `<head>`:
```html
<script>
  window.SUPABASE_URL = 'YOUR_SUPABASE_URL';
  window.SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
</script>
```
- Substitua pelos valores do seu projeto (ou configure como secret no GitHub Actions/Pages). **NÃO** comite chaves privadas em repositório público se forem sensíveis.

### 5) Testar localmente
1. Pode abrir o `index.html` direto no navegador (git clone e abrir), porém OAuth com Discord pode requerer servir via HTTP(S). Recomendo um servidor local simples como `npx http-server` ou `python -m http.server 5500` (rodando na raiz do projeto).
2. Acrescente `http://localhost:5500` aos Redirect URLs no Discord e Supabase para testes locais.
3. Teste: clique em **Entrar com Discord** → autentique → volte ao site. Usuário será criado automaticamente no `profiles` (trigger) se for novo.

### 6) Deploy no GitHub Pages
1. Faça push do repositório (com `index.html` na raiz). No repo → Settings → Pages → selecione branch `main` e root `/` como source.
2. Aguarde até 10 minutos; a URL final deve ser: `https://<your-username>.github.io/<repo-name>/`.
3. Adicione essa URL nas Redirect URLs do Discord e no Supabase Site URL (exatamente com e sem a barra final se quiser maior compatibilidade).

---

## Como funcionam os comentários ricos (GIFs / imagens / links)
- O campo `content` da tabela `comments` aceita texto. Se o usuário colar uma URL direta para imagem/GIF (ex.: `https://...gif`), o frontend detecta e renderiza `<img>` automaticamente.
- Se o texto contém links, o frontend transforma em `<a>` clicável.
- **Observação:** uploads diretos (armazenar binários) não estão incluídos — você pode adicionar depois suporte a uploads usando Supabase Storage.

---

## Segurança e permissões (RLS)
- `profiles` — todos podem ver; só dono atualiza; inserts proibidos (trigger cria automaticamente).
- `posts` — todos veem; autor insere/edita/apaga os próprios; admin modera.
- `comments` — todos veem; usuário insere/edita/apaga os próprios; admin modera.
- Leia `supabase_schema.sql` para ver as policies exatas e personalize conforme sua necessidade.

---

## Troubleshooting rápido
- **Erro redirect_uri inválido:** verifique que o Redirect URL cadastrado no Discord e no Supabase é **exatamente** o mesmo que o usado no frontend (com/sem barra final). Use a versão normalizada (`window.location.origin + window.location.pathname.replace(/\/$/, '')`) ou fixe o caminho no script.
- **Comentários não aparecem / insert falha:** confira as Policies no Supabase SQL Editor e que `user_id` está sendo enviado no insert (o script usa `user_id: user.id`).
- **Imagens não carregam (CORS/opaque):** não use raw.githubusercontent.com como fonte direta; hospede imagens em `assets/` ou em um storage que permita CORS (ex.: Supabase Storage).

---

## Como personalizar (dicas)
- Para habilitar painél admin, defina `role = 'admin'` em `profiles` no Supabase (Table Editor) para seu UUID.
- Para permitir uploads de imagens via interface, adicione suporte a **Supabase Storage** e altere o frontend para fazer `supabase.storage.from('...').upload(...)` antes de inserir comentário/post.

---

## Assinatura dev
Feito com carinho por **Orion**, seu assistente dev. 🗼✨

---
