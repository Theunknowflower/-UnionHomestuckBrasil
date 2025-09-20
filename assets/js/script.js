
// Orion scaffold script - replace SUPABASE_URL/ANON_KEY before use
const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
console.log('Orion script loaded - set SUPABASE_URL & SUPABASE_ANON_KEY in index.html before script if using Supabase');
