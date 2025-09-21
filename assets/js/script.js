// Orion scaffold script - Supabase + UI
// ======================================

// === CONFIG SUPABASE ===
const SUPABASE_URL = window.SUPABASE_URL || "https://vhopcdzemdiqtvrwmqqo.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Orion script loaded ✅");

// === Login com Discord ===
const loginBtn = document.getElementById("loginWithDiscord");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin }
    });
    if (error) console.error("Erro login Discord:", error.message);
  });
}

// Escuta sessão e atualiza UI
supabase.auth.onAuthStateChange(async (event, session) => {
  const headerUser = document.getElementById("headerUser");
  const avatar = document.getElementById("userAvatar");
  if (session?.user) {
    const email = session.user.email || "Usuário";
 let displayName = session.user.user_metadata.full_name 
               || session.user.email.split("@")[0]; 
  } else {
    headerUser.innerText = "Convidado";
    avatar.innerText = "U";
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

// === Renderizar posts + expandir comentários ===
async function renderPosts() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, content, created_at, profiles(display_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar posts:", error.message);
    return;
  }

  const forumList = document.getElementById("forumList");
  forumList.innerHTML = "";

  posts.forEach(p => {
    const card = document.createElement("div");
    card.className = "post-card";
    card.id = `post-${p.id}`;

    card.innerHTML = `
      <div class="post-head">
        <strong>${p.profiles?.display_name || "Usuário"}</strong>
        <small>${new Date(p.created_at).toLocaleString()}</small>
      </div>
      <div class="post-body">${p.content}</div>
      <div class="post-actions">
        <button class="btn-gradient" onclick="togglePostOpen('${p.id}')">💬 Comentários</button>
      </div>
      <div class="comments" id="comments-${p.id}" style="display:none"></div>
    `;
    forumList.appendChild(card);
  });
}




// === Criar novo post ===
const publishBtn = document.getElementById("publishPostBtn");
if (publishBtn) {
  publishBtn.addEventListener("click", async () => {
    const textarea = document.getElementById("newPostContent");
    const content = textarea.value.trim();
    if (!content) return alert("Escreva algo!");

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return alert("Você precisa estar logado para postar.");

    const { error } = await supabase
      .from("posts")
      .insert([{ content, user_id: user.id }]);

    if (error) {
      console.error("Erro ao criar post:", error.message);
      alert("Erro ao publicar post.");
    } else {
      textarea.value = "";
      closeModal("newPostModal");
      renderPosts();
    }
  });
}

function togglePostOpen(postId) {
  const commentsEl = document.getElementById(`comments-${postId}`);
  if (!commentsEl) return;
  const isOpen = commentsEl.style.display === "block";
  commentsEl.style.display = isOpen ? "none" : "block";
  if (!isOpen) loadComments(postId);
}

async function loadComments(postId) {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("content, created_at, profiles(display_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    return;
  }

  const commentsEl = document.getElementById(`comments-${postId}`);
  commentsEl.innerHTML = comments.map(c => `
    <div class="comment">
      <strong>${c.profiles?.display_name || "Usuário"}</strong>: ${c.content}
      <small>${new Date(c.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

// === Adicionar comentário ===
async function addComment(postId, text) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("Você precisa estar logado para comentar.");

  const { error } = await supabase
    .from("comments")
    .insert([{ post_id: postId, user_id: user.id, content: text }]);

  if (error) {
    console.error("Erro ao comentar:", error.message);
    alert("Erro ao adicionar comentário.");
  } else {
    loadComments(postId);
  }
}
window.addComment = addComment;

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



// === Denunciar usuário ou post ===
async function reportPost(postId, reason="Inapropriado") {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("Você precisa estar logado para denunciar.");

  const { error } = await supabase
    .from("reports")
    .insert([{ reporter: user.id, post_id: postId, reason }]);

  if (error) {
    console.error("Erro ao denunciar:", error.message);
    alert("Erro ao enviar denúncia.");
  } else {
    alert("Denúncia enviada para os administradores.");
  }
}
window.reportPost = reportPost;


// === Logout ===
async function logout() {
  await supabase.auth.signOut();
  document.getElementById("headerUser").innerText = "Convidado";
  document.getElementById("userAvatar").innerText = "U";
  alert("Você saiu da conta.");
}
window.logout = logout;
