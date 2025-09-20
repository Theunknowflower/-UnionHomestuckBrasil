// Conectar ao Supabase
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exemplo de login com Discord
document.addEventListener("DOMContentLoaded", () => {
  console.log("Site carregado. Conecte ao Supabase aqui.");
});
