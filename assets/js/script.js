// Orion scaffold script - Supabase + UI
// ======================================

// === CONFIG SUPABASE ===
const SUPABASE_URL = window.SUPABASE_URL || "https://vhopcdzemdiqtvrwmqqo.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Orion script loaded ✅");

// === LOGIN DISCORD ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginWithDiscord");
  if (btn) {
    btn.addEventListener("click", async () => {
      console.log("Botão Discord clicado!");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: window.location.origin }
      });
      if (error) console.error("Erro login Discord:", error.message);
    });
  }
});

// === FUNÇÃO openTab (corrige menus) ===
function openTab(tabId) {
  // esconde todos
  document.querySelectorAll(".panel").forEach(p => (p.style.display = "none"));
  // mostra selecionado
  const el = document.getElementById(tabId);
  if (el) el.style.display = "block";
}
window.openTab = openTab; // Orion fix

// === FORUM SIDEBAR ===
function toggleForumSidebar() {
  const sidebar = document.getElementById("forumSidebar");
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle("open");
  sidebar.setAttribute("aria-hidden", !isOpen);
}
window.toggleForumSidebar = toggleForumSidebar;

// Eventos globais
document.addEventListener("click", (e) => {
  if (e.target && (e.target.id === "openNewPostBtn" || e.target.id === "openForumBtn")) {
    toggleForumSidebar();
  }
});

// === POSTS ===
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
window.renderPosts = renderPosts;

// Helper para criar um post-card
function createPostCard({ id, author, avatarInitial, content, created_at }) {
  const div = document.createElement("div");
  div.id = `post-${id}`;
  div.className = "post-card";
  div.innerHTML = `
    <div class="post-head">
      <div class="avatar">${avatarInitial}</div>
      <strong>${author}</strong>
      <small>${new Date(created_at).toLocaleString()}</small>
    </div>
    <div class="post-body">${content}</div>
    <div class="post-actions">
      <button class="btn-gradient" onclick="togglePostOpen('${id}')">Ver / Comentários</button>
    </div>
    <div class="comments" id="comments-${id}" style="display:none"></div>
  `;
  return div;
}

// Expandir post
function togglePostOpen(postId) {
  const el = document.getElementById(`post-${postId}`);
  const comments = document.getElementById(`comments-${postId}`);
  if (!el || !comments) return;

  const open = el.classList.toggle("open");
  comments.style.display = open ? "block" : "none";

  if (open) renderComments(postId);
}
window.togglePostOpen = togglePostOpen;

// === COMENTÁRIOS ===
async function renderComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, user_id, user:profiles(display_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    return;
  }

  const container = document.getElementById(`comments-${postId}`);
  container.innerHTML = "";

  data.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `
      <strong>${c.user?.display_name || "Usuário"}</strong>
      <p>${c.content}</p>
      <small>${new Date(c.created_at).toLocaleString()}</small>
    `;
    container.appendChild(div);
  });

  // form p/ comentar
  const form = document.createElement("div");
  form.innerHTML = `
    <textarea id="commentInput-${postId}" placeholder="Escreva um comentário..."></textarea>
    <button onclick="addComment('${postId}')">Comentar</button>
  `;
  container.appendChild(form);
}

async function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const content = input.value.trim();
  if (!content) return;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    alert("Você precisa estar logado.");
    return;
  }

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    content
  });

  if (error) {
    console.error("Erro ao comentar:", error.message);
    return;
  }

  input.value = "";
  renderComments(postId);
}
window.addComment = addComment;
