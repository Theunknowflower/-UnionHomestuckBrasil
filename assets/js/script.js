// Orion scaffold script - Supabase + UI
// ======================================

// === CONFIG SUPABASE ===
const SUPABASE_URL = window.SUPABASE_URL || "https://vhopcdzemdiqtvrwmqqo.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Orion script loaded ✅");


const loginBtn = document.getElementById("loginWithDiscord");
const logoutBtn = document.getElementById("logoutBtn");
const headerUser = document.getElementById("headerUser");
const avatar = document.getElementById("userAvatar");

// Login
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin + "/UnionHomestuckBrasil" }
    });
    if (error) console.error("Erro login Discord:", error.message);
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    headerUser.innerText = "Convidado";
    avatar.innerText = "U";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  });
}

// Sessão
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    let displayName =
      session.user.user_metadata.full_name ||
      session.user.email.split("@")[0];

    headerUser.innerText = displayName;
    avatar.innerText = displayName[0].toUpperCase();

    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    headerUser.innerText = "Convidado";
    avatar.innerText = "U";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

// === FUNÇÃO openTab (corrige menus) ===
function openTab(tabId) {
  document.querySelectorAll(".panel").forEach(
    (p) => (p.style.display = "none")
  );
  const el = document.getElementById(tabId);
  if (el) el.style.display = "block";
}
window.openTab = openTab;

// === FORUM SIDEBAR ===
function toggleForumSidebar() {
  const sidebar = document.getElementById("forumSidebar");
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle("open");
  sidebar.setAttribute("aria-hidden", !isOpen);
}
window.toggleForumSidebar = toggleForumSidebar;

document.addEventListener("click", (e) => {
  if (e.target && (e.target.id === "openNewPostBtn" || e.target.id === "openForumBtn")) {
    toggleForumSidebar();
  }
});

// === Renderizar posts ===
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

  posts.forEach((p) => {
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

// === Expandir post + comentários ===
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

  data.forEach((c) => {
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

  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: user.id, content });

  if (error) {
    console.error("Erro ao comentar:", error.message);
    return;
  }

  input.value = "";
  renderComments(postId);
}
window.addComment = addComment;

// === Denunciar post ===
async function reportPost(postId, reason = "Inapropriado") {
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

supabase.auth.onAuthStateChange(async (event, session) => {
  const headerUser = document.getElementById("headerUser");
  const avatar = document.getElementById("userAvatar");
  const loginBtn = document.getElementById("loginWithDiscord");
  options: { redirectTo: window.location.origin + "/UnionHomestuckBrasil" }
  const logoutBtn = document.querySelector(".btn-logout");

  if (session?.user) {
    let displayName = session.user.user_metadata.full_name 
                   || session.user.email.split("@")[0];
    headerUser.innerText = displayName;
    avatar.innerText = displayName[0].toUpperCase();
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    headerUser.innerText = "Convidado";
    avatar.innerText = "U";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});
// === PERFIL DE USUÁRIO ===
async function loadProfile() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, banner_url")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Erro ao carregar perfil:", error.message);
    return;
  }

  // Atualiza UI
  document.getElementById("profileName").innerText = data?.display_name || "Usuário";
  document.getElementById("profileEmail").innerText = user.email;
  document.getElementById("profileAvatar").style.backgroundImage = data?.avatar_url ? `url(${data.avatar_url})` : "none";
  document.getElementById("profileBanner").style.backgroundImage = data?.banner_url ? `url(${data.banner_url})` : "none";

  // Preenche formulário
  document.getElementById("displayNameInput").value = data?.display_name || "";
  document.getElementById("avatarUrlInput").value = data?.avatar_url || "";
  document.getElementById("bannerUrlInput").value = data?.banner_url || "";
}

// === Salvar perfil ===
document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const updates = {
    id: user.id,
    display_name: document.getElementById("displayNameInput").value,
    avatar_url: document.getElementById("avatarUrlInput").value,
    banner_url: document.getElementById("bannerUrlInput").value,
    updated_at: new Date()
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(updates);

  if (error) {
    console.error("Erro ao salvar perfil:", error.message);
    alert("Erro ao salvar perfil.");
  } else {
    alert("Perfil atualizado!");
    loadProfile();
  }
});
// === THEME MODULE (ORION SAFE BLOCK) ===
(function(){
  if (window.__orion_theme_registered) return;
  window.__orion_theme_registered = true;

  // helpers
  function el(id){ return document.getElementById(id); }

  // modal helpers (definem closeModal/openModal se não existirem)
  window.openModal = window.openModal || function(id){
    const m = el(id);
    if (!m) return;
    m.setAttribute('aria-hidden','false');
    m.style.display = 'flex';
  };
  window.closeModal = window.closeModal || function(id){
    const m = el(id);
    if (!m) return;
    m.setAttribute('aria-hidden','true');
    m.style.display = 'none';
  };

  // Aplica tema (salva escolha no localStorage)
  function applyTheme(theme){
    if (!theme) return;
    if (theme.bgImage) {
      document.body.style.background = `url(${theme.bgImage}) center/cover fixed`;
      document.body.style.backgroundSize = 'cover';
    } else {
      document.body.style.background = theme.bgColor || '';
      document.body.style.backgroundSize = '';
    }
    document.documentElement.style.setProperty('--main-color', theme.color || '');
    try { localStorage.setItem('selectedTheme', JSON.stringify(theme)); } catch(e){}
  }
  window.applyTheme = applyTheme;

  // Carrega temas da tabela settings (key='theme')
  async function loadThemes(){
    const themeList = el('themeList');
    if (!themeList) return;
    themeList.innerHTML = '<div>Carregando temas...</div>';
    const { data, error } = await supabase.from('settings').select('id,value').eq('key','theme');
    if (error) {
      console.error('Erro ao carregar temas:', error);
      themeList.innerHTML = '<div>Erro ao carregar temas</div>';
      return;
    }
    themeList.innerHTML = '';
    (data || []).forEach(row => {
      let theme;
      try { theme = JSON.parse(row.value); } catch(e){ return; }
      const btn = document.createElement('button');
      btn.className = 'btn-theme';
      btn.textContent = theme.name || 'Tema';
      if (theme.bgImage) {
        btn.style.backgroundImage = `url(${theme.bgImage})`;
        btn.style.backgroundSize = 'cover';
        btn.style.backgroundPosition = 'center';
      } else {
        btn.style.background = theme.bgColor || '#444';
      }
      btn.style.color = theme.color || '#fff';

      btn.addEventListener('mouseenter', () => applyTheme(theme)); // preview
      btn.addEventListener('mouseleave', () => {
        const saved = localStorage.getItem('selectedTheme');
        if (saved) try { applyTheme(JSON.parse(saved)); } catch(e){ document.body.style.background = ''; document.documentElement.style.removeProperty('--main-color'); }
        else { document.body.style.background = ''; document.documentElement.style.removeProperty('--main-color'); }
      });
      btn.addEventListener('click', () => applyTheme(theme)); // apply permanently (until changed)
      themeList.appendChild(btn);
    });

    // show admin creator if admin (fetch profile.role)
    try {
      const { data: udata } = await supabase.auth.getUser();
      const user = udata?.user;
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (prof?.role === 'admin') {
          const adminEl = el('adminThemeCreator');
          if (adminEl) adminEl.style.display = 'block';
        }
      }
    } catch (e) { console.warn('checkIfAdmin failed', e); }

    // apply saved theme (user preference)
    try {
      const saved = localStorage.getItem('selectedTheme');
      if (saved) applyTheme(JSON.parse(saved));
    } catch(e){}
  }
  window.loadThemes = loadThemes;

  // Criar novo tema (attach safe)
  function attachCreateThemeHandler(){
    const btn = el('createThemeBtn');
    if (!btn) return;
    // remove previous handlers if any (safe)
    if (btn._orion_attached) return;
    btn._orion_attached = true;
    btn.addEventListener('click', async () => {
      const name = el('themeName')?.value || 'Tema';
      const color = el('themeColor')?.value || '#ffffff';
      const bgColor = el('themeBgColor')?.value || '#000000';
      const bgImage = el('themeBgImage')?.value || '';
      const theme = { name, color, bgColor, bgImage };
      const { error } = await supabase.from('settings').insert([{ key: 'theme', value: JSON.stringify(theme) }]);
      if (error) {
        console.error('Erro ao salvar tema:', error);
        alert('Erro ao salvar tema: ' + (error.message || JSON.stringify(error)));
      } else {
        alert('Tema criado!');
        await loadThemes();
      }
    });
  }

  // iniciadores
  document.addEventListener('DOMContentLoaded', () => {
    loadThemes();
    attachCreateThemeHandler();
    // garanta que modais iniciem escondidos
    ['themeModal','profileModal'].forEach(id => {
      const m = el(id);
      if (m) { m.setAttribute('aria-hidden','true'); m.style.display = 'none'; }
    });
  });

})();


// === PROFILE MODAL ===
async function openProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("Erro ao carregar perfil:", error.message);
    return;
  }

  const container = document.getElementById("profileDetails");
  container.innerHTML = `
    <div class="profile-banner" style="background:url(${data.banner_url || ""}) center/cover"></div>
    <div class="profile-info">
      <img class="avatar" src="${data.avatar_url || "default.png"}" alt="">
      <h3>${data.display_name || "Usuário"}</h3>
      <p>Função: ${data.role}</p>
      <button onclick="sendFriendRequest('${data.id}')">Adicionar amigo</button>
      <button onclick="reportUser('${data.id}')">Denunciar</button>
    </div>
  `;

  openModal("profileModal");
}
window.openProfile = openProfile;

// Carrega perfil sempre que o usuário logar
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) loadProfile();
});
  function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute("aria-hidden", "true");
}
window.openModal = openModal;
window.closeModal = closeModal;

