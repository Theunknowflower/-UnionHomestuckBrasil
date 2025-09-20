// Orion scaffold script - replace SUPABASE_URL/ANON_KEY before use
const SUPABASE_URL = window.SUPABASE_URL || 'https://vhopcdzemdiqtvrwmqqo.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Botão de login com Discord
const loginBtn = document.getElementById("loginWithDiscord");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        // 🚨 Fix: GitHub Pages precisa da pasta do projeto no redirect
        redirectTo: "https://theunknowflower.github.io/UnionHomestuckBrasil/"
      }
    });
    if (error) console.error("Erro login Discord:", error.message);
  });
}

console.log('Orion script loaded - Supabase + Discord OAuth configurado 🚀');

/* ---------- UI helpers: sidebar toggle, post expand, gradient click state ---------- */

function toggleForumSidebar() {
  const sidebar = document.getElementById('forumSidebar');
  if (!sidebar) return;
  const open = sidebar.classList.toggle('open');
  sidebar.setAttribute('aria-hidden', !open);
}
window.toggleForumSidebar = toggleForumSidebar;

document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'openNewPostBtn' || e.target.id === 'openForumBtn')) {
    toggleForumSidebar();
  }
});

function togglePostOpen(postId) {
  const el = document.getElementById(`post-${postId}`);
  if (!el) return;
  el.classList.toggle('open');
}

document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn-gradient');
  if (!b) return;
  b.classList.add('active');
  const remove = () => { 
    b.classList.remove('active'); 
    b.removeEventListener('pointerup', remove); 
    b.removeEventListener('pointerleave', remove); 
  };
  b.addEventListener('pointerup', remove);
  b.addEventListener('pointerleave', remove);
});

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






















async function addComment(postId, content) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Você precisa estar logado!");
    return;
  }

  const { error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      content: content
    });

  if (error) {
    console.error("Erro ao comentar:", error.message);
    alert("Erro: " + error.message);
  } else {
    renderComments(postId); // atualiza a lista de comentários
  }
}

async function renderComments(postId) {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, content, created_at, author:profiles(display_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    return;
  }

  const section = document.getElementById("comments-" + postId);
  section.innerHTML = "";

  comments.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${c.author?.display_name || "Usuário"}</strong>: ${c.content}`;
    section.appendChild(div);
  });
}


