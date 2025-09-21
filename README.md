# UnionHomestuckBrasil — Pack (Orion)

Este pacote contém um site estático (frontend) que integra com Supabase para autenticação (Discord), posts, comentários, temas e um índice de páginas para leitura.

## Conteúdo
- `index.html` — página principal.
- `assets/js/script.js` — lógica (autenticação, posts, comentários, temas, leitor de páginas).
- `assets/css/style.css` — estilos (desktop + mobile).
- `supabase_schema.sql` — script para criar tabelas no Supabase.
- `README.md` — este arquivo.

## Como usar (passo-a-passo)
1. Baixe e extraia o pacote.
2. Abra `index.html` e substitua `window.SUPABASE_URL` e `window.SUPABASE_ANON_KEY` pelas suas credenciais do projeto Supabase **(IMPORTANTE)**.
3. No Supabase:
   - Rode o script `supabase_schema.sql` no SQL editor para criar tabelas.
   - Em Authentication → Settings defina **Site URL** para `https://<seu-user>.github.io/<repo>` (ex: `https://theunknowflower.github.io/UnionHomestuckBrasil`).
   - Em Auth → Providers habilite **Discord** e configure Client ID/Secret. Configure redirect URI para `https://<seu-site>/` (use o mesmo site).
4. Suba os arquivos para o GitHub (branch `main`) e ative GitHub Pages (Settings → Pages → branch `main` / folder `/ (root)`).
5. Teste o login via Discord: ao clicar em "Entrar com Discord" o Supabase irá redirecionar para autenticação. Após login, o usuário deve voltar ao site.
6. Teste postar e comentar (requer Supabase configurado).

## Fallback local
Se você não configurar Supabase, o frontend ainda carrega e permite navegação; publicar/comentar requer Supabase.

## Notas de segurança
- Configure políticas RLS adequadas no Supabase para proteger dados. O arquivo `.sql` inclui políticas mínimas para `profiles`.
- Não exponha o service_role key no frontend. Use apenas ANON KEY no cliente.
- Denúncias e administração: use roles (atribuir na tabela `profiles` a role `admin`) e controle via RLS/policies.

## Próximos passos (opcional)
- Implementar RPCs (stored procedures) para operações complexas.
- Criar painel admin com alteração de temas global.
- Implementar bot Discord que busca páginas (usando a tabela `pages`).

---

Assinado,
**Orion** — Dev helper (gerado por assistente).  
