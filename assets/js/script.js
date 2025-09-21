
/* Orion final script - Comments with media preview, login and forum */

// Supabase init - replace in index.html or set window vars before including this script
const SUPABASE_URL = window.SUPABASE_URL || 'https://vhopcdzemdiqtvrwmqqo.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// friendly console signature
console.log("%cOrion — dev helper 🌙", "color:#00b894; font-weight:bold; font-size:14px;");
console.log("%cDica: abra o README.md para instruções de deploy e configuração.", "color:#0984e3;");

if (!supabase) {
  console.warn("Supabase client não encontrado. Verifique se a tag <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js'></script> foi carregada.");
}

// utility: detect image URL
function isImageUrl(url) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

// normalize URL (remove trailing slash)
function normalizedProjectUrl() {
  return window.location.origin + window.location.pathname.replace(/\/$/, "");
}

// Auth UI helpers
const headerUser = document.getElementById("headerUser");
const userAvatar = document.getElementById("userAvatar");
const loginBtn = document.getElementById("loginWithDiscord");
const signOutBtn = document.getElementById("signOutBtn");
const openNewPostBtn = document.getElementById("openNewPostBtn");
const newPostModal = document.getElementById("newPostModal");
const publishPostBtn = document.getElementById("publishPostBtn");

async function getCurrentProfile() {
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return null;
    const { data: profile, error } = await supabase.from("profiles").select("id, display_name, avatar_url, role").eq("id", user.id).single();
    if (error) {
      console.error("Erro ao buscar profile:", error.message);
      return null;
    }
    return profile;
  } catch (err) {
    console.error("getCurrentProfile error:", err);
    return null;
  }
}

async function refreshUIOnAuth() {
  const profile = await getCurrentProfile();
  if (profile) {
    headerUser.innerText = profile.display_name || "Usuário";
    userAvatar.innerText = (profile.display_name || "U")[0].toUpperCase();
    loginBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
  } else {
    headerUser.innerText = "Convidado";
    userAvatar.innerText = "U";
    loginBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
  }
}

// login with Discord
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const redirectUrl = normalizedProjectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: redirectUrl }
    });
    if (error) console.error("Erro login Discord:", error.message);
  });
}

// sign out
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    await refreshUIOnAuth();
  });
}

// Listen to auth state changes
if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
  supabase.auth.onAuthStateChange((event, session) => {
    // console.log("auth event", event);
    refreshUIOnAuth();
    // re-render posts to update controls for owner/admin
    setTimeout(() => renderPosts(), 300);
  });
}

// small helper to escape HTML (basic)
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// render posts
async function renderPosts() {
  const forumList = document.getElementById("forumList");
  forumList.innerHTML = "<div class='text-muted'>Carregando...</div>";

  const { data: posts, error } = await supabase.from("posts").select("id, content, created_at, user_id, author_id").order("created_at", { ascending:false });
  if (error) {
    console.error("Erro ao carregar posts:", error.message);
    forumList.innerHTML = "<div class='text-muted'>Erro ao carregar posts</div>";
    return;
  }
  forumList.innerHTML = "";

  // collect author ids to fetch profiles
  const userIds = Array.from(new Set(posts.map(p => p.author_id || p.user_id).filter(Boolean)));
  let profilesMap = {};
  if (userIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, role").in("id", userIds);
    profilesMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
  }

  for (const p of posts) {
    const authorId = p.author_id || p.user_id;
    const author = profilesMap[authorId] || null;

    const card = document.createElement("div");
    card.className = "post-card";
    card.id = `post-${p.id}`;
    card.innerHTML = `
      <div class="post-head">
        <div class="post-avatar">${escapeHtml((author?.display_name||"U").slice(0,1).toUpperCase())}</div>
        <div class="post-meta">
          <div class="name">${escapeHtml(author?.display_name || "Usuário")}</div>
          <div class="time">${new Date(p.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(p.content)}</div>
      <div class="post-actions">
        <button class="btn-main" onclick="toggleComments('${p.id}')">Ver comentários</button>
        <button class="btn-small" onclick="openCommentBox('${p.id}')">Comentar</button>
      </div>
      <div class="comments" id="comments-for-${p.id}" style="display:none"></div>
    `;
    forumList.appendChild(card);
    // render comments for the post
    renderComments(p.id);
  }
}

// toggle comments visibility
function toggleComments(postId) {
  const el = document.getElementById(`comments-for-${postId}`);
  if (!el) return;
  el.style.display = (el.style.display === "none") ? "block" : "none";
}

// open comment box
function openCommentBox(postId) {
  const el = document.getElementById(`comments-for-${postId}`);
  if (!el) return;
  if (el.querySelector(".comment-box")) return; // already open
  const box = document.createElement("div");
  box.className = "comment-box";
  box.innerHTML = `
    <textarea id="comment-input-${postId}" placeholder="Escreva um comentário..." style="width:100%;height:80px"></textarea>
    <div style="margin-top:8px">
      <button class="btn-main" onclick="addComment('${postId}')">Enviar</button>
    </div>
  `;
  el.prepend(box);
  // ensure visible
  el.style.display = "block";
}

// add comment
async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return alert("Caixa de comentário não encontrada.");
  const text = input.value.trim();
  if (!text) return alert("Comentário vazio.");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Você precisa estar logado para comentar.");

  const { error } = await supabase.from("comments").insert([{
    post_id: postId,
    user_id: user.id,
    content: text
  }]);

  if (error) {
    console.error("Erro ao inserir comentário:", error.message);
    alert("Erro ao comentar: " + error.message);
    return;
  }

  input.value = "";
  renderComments(postId);
}

// render comments
async function renderComments(postId) {
  const el = document.getElementById(`comments-for-${postId}`);
  if (!el) return;
  el.innerHTML = "<div class='text-muted'>Carregando comentários...</div>";

  const { data: comments, error } = await supabase.from("comments").select("id, content, created_at, user_id").eq("post_id", postId).order("created_at", { ascending:true });
  if (error) {
    console.error("Erro ao carregar comentários:", error.message);
    el.innerHTML = "<div class='text-muted'>Erro carregando comentários</div>";
    return;
  }
  el.innerHTML = "";

  // fetch profiles for commenters
  const userIds = Array.from(new Set((comments || []).map(c => c.user_id).filter(Boolean)));
  let profilesMap = {};
  if (userIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, role").in("id", userIds);
    profilesMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
  }

  for (const c of comments) {
    const author = profilesMap[c.user_id] || null;
    const div = document.createElement("div");
    div.className = "comment";
    // render possible image links
    let contentHtml = escapeHtml(c.content);
    // find URLs in content (simple)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    contentHtml = contentHtml.replace(urlRegex, (match) => {
      if (isImageUrl(match)) {
        return `<div><img src="${match}" alt="imagem"></div>`;
      } else {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
      }
    });

    div.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">
        <div style="width:36px;height:36px;border-radius:8px;background:#eee;display:flex;align-items:center;justify-content:center;font-weight:700">${escapeHtml((author?.display_name||"U").slice(0,1).toUpperCase())}</div>
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(author?.display_name || "Usuário")}</div>
          <div style="font-size:13px;color:#666;margin-bottom:6px">${new Date(c.created_at).toLocaleString()}</div>
          <div>${contentHtml}</div>
        </div>
      </div>
    `;
    el.appendChild(div);
  }

  // show comment box if logged
  const profile = await getCurrentProfile();
  if (profile) {
    if (!el.querySelector(`#comment-input-${postId}`)) {
      el.innerHTML += `
        <div style="margin-top:8px">
          <textarea id="comment-input-${postId}" placeholder="Escreva um comentário..." style="width:100%;height:80px"></textarea>
          <div style="margin-top:8px"><button class="btn-main" onclick="addComment('${postId}')">Enviar</button></div>
        </div>
      `;
    }
  }
}

// new post flow
if (openNewPostBtn) {
  openNewPostBtn.addEventListener("click", () => {
    newPostModal.style.display = "flex";
  });
}
function closeNewPost() {
  newPostModal.style.display = "none";
}
if (publishPostBtn) {
  publishPostBtn.addEventListener("click", async () => {
    const content = document.getElementById("newPostContent").value.trim();
    if (!content) return alert("Escreva algo antes de publicar.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Você precisa estar logado.");
    const { error } = await supabase.from("posts").insert([{
      content, user_id: user.id
    }]);
    if (error) {
      console.error("Erro ao criar post:", error.message);
      alert("Erro: " + error.message);
      return;
    }
    closeNewPost();
    renderPosts();
  });
}

// initial load
document.addEventListener("DOMContentLoaded", () => {
  refreshUIOnAuth();
  setTimeout(() => renderPosts(), 300);
});

// user etc

async function sendFriendRequest(targetUserId) {
  const { error } = await supabase.from("friend_requests").insert({
    sender: (await supabase.auth.getUser()).data.user.id,
    receiver: targetUserId,
  });
  if (error) console.error("Erro ao enviar amizade:", error);
  else alert("Pedido de amizade enviado!");
}

// likes

async function likePost(postId) {
  const userId = (await supabase.auth.getUser()).data.user.id;
  const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  if (error) console.error("Erro ao curtir:", error);
}

async function getTopPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, created_at, post_likes(count)")
    .order("post_likes.count", { ascending: false });
  return data;
}

// conquistas

create or replace function award_comment_achievement()
returns trigger as $$
begin
  if (select count(*) from comments where user_id = new.user_id) >= 10 then
    insert into user_achievements(user_id, achievement_id)
    values (new.user_id, '<uuid-da-conquista>')
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_award_comment after insert on comments
for each row execute procedure award_comment_achievement();


// progresso de leitura

async function savePage(pageId) {
  const userId = (await supabase.auth.getUser()).data.user.id;
  await supabase.from("progress").upsert({ user_id: userId, page_id: pageId });
  alert("Página salva!");
}

