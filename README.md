# UnionHomestuckBrasil

## 🚀 Como rodar
1. Faça upload deste repositório no GitHub em **UnionHomestuckBrasil**.
2. Vá em **Settings → Pages** e selecione:
   - Branch: `main`
   - Folder: `/ (root)`
3. O site ficará disponível em:
   https://theunknowflower.github.io/UnionHomestuckBrasil/

## 🔑 Integração Supabase + Discord
- Configure seu projeto no [Supabase](https://supabase.com).
- Ative o provedor **Discord** em `Authentication → Providers`.
- Em `script.js`, adicione sua `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## 📂 Estrutura
- `index.html` → página principal
- `admin.html` → painel admin
- `assets/css/style.css` → estilos
- `assets/js/script.js` → lógica do site
- `supabase_schema.sql` → tabelas e policies para o Supabase
