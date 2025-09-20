
// Orion scaffold script - replace SUPABASE_URL/ANON_KEY before use
const SUPABASE_URL = window.SUPABASE_URL || 'https://vhopcdzemdiqtvrwmqqo.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
console.log('Orion script loaded - set SUPABASE_URL & SUPABASE_ANON_KEY in index.html before script if using Supabase');
/* ---------- UI helpers: sidebar toggle, post expand, gradient click state ---------- */

/* Toggle forum sidebar (uses .open class already presente) */
function toggleForumSidebar() {
  const sidebar = document.getElementById('forumSidebar');
  if (!sidebar) return;
  const open = sidebar.classList.toggle('open');
  sidebar.setAttribute('aria-hidden', !open);
}
window.toggleForumSidebar = toggleForumSidebar;

/* Attach to a button you have (e.g., add this to header or a forum button) */
document.addEventListener('click', (e) => {
  // open forum when clicking forum icon / openNewPostBtn (you can change selectors)
  if (e.target && (e.target.id === 'openNewPostBtn' || e.target.id === 'openForumBtn')) {
    toggleForumSidebar();
  }
});

/* Expand/collapse a given post card by id
   expects each post card DOM element to have id="post-{postId}" and class "post-card" */
function togglePostOpen(postId) {
  const el = document.getElementById(`post-${postId}`);
  if (!el) return;
  el.classList.toggle('open');
}

/* Example: when rendering each post in JS, do:
   <div id="post-${p.id}" class="post-card">
     <div class="post-head">...</div>
     <div class="post-body">...</div>
     <div class="post-actions">
       <button class="btn-gradient" onclick="togglePostOpen('${p.id}')">Ver / Comentários</button>
     </div>
     <div class="comments"> ... </div>
   </div>
*/

/* Gradient button visual "active" toggle for JS-triggered actions */
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn-gradient');
  if (!b) return;
  b.classList.add('active');
  const remove = () => { b.classList.remove('active'); b.removeEventListener('pointerup', remove); b.removeEventListener('pointerleave', remove); };
  b.addEventListener('pointerup', remove);
  b.addEventListener('pointerleave', remove);
});

/* Utility to programmatically render a post card (example)
   Use this or adapt to your current renderPosts() implementation */
async function renderPosts() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, content, created_at, author:profiles(display_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar posts:", error.message);
    return;
  }

  const forumList = document.getElementById("forumList");
  forumList.innerHTML = "";

  posts.forEach(p => {
    const card = createPostCard({
      id: p.id,
      author: p.author?.display_name || "Usuário",
      avatarInitial: (p.author?.display_name || "U")[0].toUpperCase(),
      content: p.content,
      created_at: p.created_at
    });
    forumList.appendChild(card);
  });
}


document.getElementById("loginWithDiscord")?.addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: window.location.origin // ex: https://theunknowflower.github.io/UnionHomestuckBrasil
    }
  });
  if (error) console.error("Erro login Discord:", error.message);
});

