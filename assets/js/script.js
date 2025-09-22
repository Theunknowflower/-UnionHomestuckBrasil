

// script.js (Orion) - versão corrigida e organizada
// -------------------------------------------------
// Substitua OAUTH_REDIRECT em caso de URL diferente.
// As credenciais do Supabase devem ser definidas no HTML (window.SUPABASE_URL / window.SUPABASE_ANON_KEY)

(async function () {
  "use strict";

  // --- CONFIG (use os valores definidos no index.html)
  const SUPABASE_URL = window.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
  const OAUTH_REDIRECT = window.OAUTH_REDIRECT || "https://theunknowflower.github.io/UnionHomestuckBrasil/"; // ajuste se necessário

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase keys não definidas. Configure window.SUPABASE_URL e window.SUPABASE_ANON_KEY no HTML.");
  }

  // Cria cliente Supabase (CDN expõe `supabase.createClient`)
  const supabase = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  if (!supabase) {
    console.error("Supabase client não encontrado. Verifique se o script do supabase foi carregado antes deste arquivo.");
    return;
  }

  console.log("Orion script loaded — Supabase:", !!supabase);

  // --- Helpers de DOM seguros
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const safeGet = (id) => document.getElementById(id);

  // --- Modal helpers (centralizados) ---
  function setModalState(modalEl, open) {
    if (!modalEl) return;
    modalEl.setAttribute("aria-hidden", open ? "false" : "true");
    modalEl.style.display = open ? "flex" : "none";

    // Mostrar/ocultar botão fechar adequadamente
    const closeBtn = modalEl.querySelector(".modal-close");
    if (closeBtn) closeBtn.style.display = open ? "block" : "none";
  }
  function openModal(id) {
    const m = safeGet(id);
    setModalState(m, true);
  }
  function closeModal(id) {
    const m = safeGet(id);
    setModalState(m, false);
  }

  // exportar para HTML inline se necessário
  window.openModal = openModal;
  window.closeModal = closeModal;

  // --- Inicialização de modais: garante que X esteja escondido até abrir ---
  function initModals() {
    $$(" .modal").forEach(m => {
      m.setAttribute("aria-hidden", "true");
      m.style.display = "none";
      const closeBtn = m.querySelector(".modal-close");
      if (closeBtn) {
        // garante que não fique visível fora do modal
        closeBtn.style.display = "none";
        // adiciona handler seguro (não conflita com onclick inline)
        closeBtn.addEventListener("click", () => closeModal(m.id));
      }
      // fecha ao clicar fora do inner
      m.addEventListener("click", (ev) => {
        if (ev.target === m) closeModal(m.id);
      });
    });

    // fecha modais com ESC
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        $$("[aria-hidden='false']").forEach(modal => closeModal(modal.id));
      }
    });
  }

  // --- AUTH (Discord OAuth) ---
  const loginBtn = safeGet("loginWithDiscord");
  const logoutBtn = safeGet("logoutBtn");
  const headerUser = safeGet("headerUser");
  const avatar = safeGet("userAvatar");

  async function startOAuthLogin() {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: OAUTH_REDIRECT }
      });
      if (error) console.error("Erro login Discord:", error.message);
      // não precisamos tratar success aqui porque o redirecionamento ocorre fora
    } catch (err) {
      console.error("signInWithOAuth falhou:", err);
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      startOAuthLogin();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      applyLoggedOutUI();
      alert("Você saiu da conta.");
    });
  }

  // Atualiza UI quando loga/desloga
  function applyLoggedInUI(sessionUser) {
    if (!headerUser || !avatar) return;
    const userMeta = sessionUser?.user_metadata || {};
    const displayName = (userMeta.full_name) ? userMeta.full_name : (sessionUser.email ? sessionUser.email.split("@")[0] : "Usuário");
    headerUser.innerText = displayName;
    avatar.innerText = (displayName[0] || "U").toUpperCase();
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  }
  function applyLoggedOutUI() {
    if (!headerUser || !avatar) return;
    headerUser.innerText = "Convidado";
    avatar.innerText = "U";
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // Ouve mudanças de sessão (login/logout)
  supabase.auth.onAuthStateChange(async (event, session) => {
    // session é objeto { user, ... } quando logado
    if (session?.user) {
      applyLoggedInUI(session.user);
      // carrega perfil e posts quando logado
      await loadProfile();
      await renderPosts();
    } else {
      applyLoggedOutUI();
      // ainda podemos renderizar posts públicos
      await renderPosts();
    }
  });

  // Inicializa estado atual
  (async () => {
    const { data: s } = await supabase.auth.getSession();
    if (s?.session?.user) applyLoggedInUI(s.session.user);
    else applyLoggedOutUI();
  })();

  // --- TABS / UI utilities ---
  function openTab(tabId) {
    $$(".panel").forEach(p => (p.style.display = "none"));
    const el = safeGet(tabId);
    if (el) el.style.display = "block";
  }
  window.openTab = openTab;

  function toggleForumSidebar() {
    const sidebar = safeGet("forumSidebar");
    if (!sidebar) return;
    const open = sidebar.classList.toggle("open");
    sidebar.setAttribute("aria-hidden", !open);
  }
  window.toggleForumSidebar = toggleForumSidebar;

  // --- POSTS / FORUM ---
  async function renderPosts() {
    const forumList = safeGet("forumList");
    if (!forumList) return;
    forumList.innerHTML = "<div>Carregando...</div>";

    const { data: posts, error } = await supabase
      .from("posts")
      // puxamos o author através de profiles (assume foreign key profiles.id = auth.users.id)
      .select("id, content, created_at, user_id, author:profiles(display_name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar posts:", error.message);
      forumList.innerHTML = "<div>Erro no carregamento dos posts.</div>";
      return;
    }

    forumList.innerHTML = "";
    (posts || []).forEach(p => {
      const card = createPostCard(p);
      forumList.appendChild(card);
    });
  }

  function createPostCard(post) {
    const wrapper = document.createElement("div");
    wrapper.className = "post-card";
    wrapper.id = `post-${post.id}`;

    // Cabeçalho
    const head = document.createElement("div");
    head.className = "post-head";
    head.innerHTML = `<strong>${post.author?.display_name || "Usuário"}</strong>
                      <small>${new Date(post.created_at).toLocaleString()}</small>`;

    // Corpo
    const body = document.createElement("div");
    body.className = "post-body";
    body.innerHTML = post.content || "";

    // Ações
    const actions = document.createElement("div");
    actions.className = "post-actions";

    const btnComments = document.createElement("button");
    btnComments.className = "btn-gradient";
    btnComments.textContent = "💬 Comentários";
    btnComments.addEventListener("click", () => togglePostOpen(post.id));
    actions.appendChild(btnComments);

    // Denunciar
    const btnReport = document.createElement("button");
    btnReport.className = "btn-small";
    btnReport.textContent = "🚩 Denunciar";
    btnReport.addEventListener("click", () => reportPost(post.id));
    actions.appendChild(btnReport);

    // Container de comentários (inicialmente escondido)
    const comments = document.createElement("div");
    comments.className = "comments";
    comments.id = `comments-${post.id}`;
    comments.style.display = "none";

    wrapper.appendChild(head);
    wrapper.appendChild(body);
    wrapper.appendChild(actions);
    wrapper.appendChild(comments);

    return wrapper;
  }

  function togglePostOpen(postId) {
    const postEl = safeGet(`post-${postId}`);
    const commentsEl = safeGet(`comments-${postId}`);
    if (!postEl || !commentsEl) return;

    const open = postEl.classList.toggle("open");
    commentsEl.style.display = open ? "block" : "none";
    if (open) renderComments(postId);
  }
  window.togglePostOpen = togglePostOpen;

  async function renderComments(postId) {
    const container = safeGet(`comments-${postId}`);
    if (!container) return;
    container.innerHTML = "<div>Carregando comentários...</div>";

    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, user:profiles(display_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar comentários:", error.message);
      container.innerHTML = "<div>Erro ao carregar comentários.</div>";
      return;
    }

    container.innerHTML = "";
    (data || []).forEach(c => {
      const cdiv = document.createElement("div");
      cdiv.className = "comment";
      cdiv.innerHTML = `<strong>${c.user?.display_name || "Usuário"}</strong>
                        <p>${c.content}</p>
                        <small>${new Date(c.created_at).toLocaleString()}</small>`;
      container.appendChild(cdiv);
    });

    // Form para comentar
    const form = document.createElement("div");
    form.className = "comment-form-mini";
    form.innerHTML = `
      <textarea id="commentInput-${postId}" placeholder="Escreva um comentário..."></textarea>
      <div style="text-align:right"><button class="btn-main" id="commentBtn-${postId}">Comentar</button></div>
    `;
    container.appendChild(form);

    // Handler do botão
    const btn = safeGet(`commentBtn-${postId}`);
    if (btn) {
      btn.addEventListener("click", async () => {
        const ta = safeGet(`commentInput-${postId}`);
        if (!ta) return;
        const text = ta.value.trim();
        if (!text) return alert("Escreva algo antes de comentar!");
        await addComment(postId, text);
        ta.value = "";
        await renderComments(postId); // recarrega
      });
    }
  }

  async function addComment(postId, text) {
    // valida uuid? assumimos que postId vem da DB como string
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert("Você precisa estar logado para comentar.");
      return;
    }

    const payload = {
      post_id: postId,
      user_id: user.id,
      content: text
    };

    const { error } = await supabase.from("comments").insert([payload]);
    if (error) {
      console.error("Erro ao inserir comentário:", error.message || error);
      alert("Erro ao enviar comentário.");
    } else {
      // sucesso - nada mais a fazer (caller re-renderiza)
    }
  }
  window.addComment = addComment;

  // --- Criar novo post (modal) ---
  function attachNewPostHandler() {
    const openBtn = safeGet("openNewPostBtn");
    const publishBtn = safeGet("publishPostBtn");
    if (openBtn) openBtn.addEventListener("click", () => openModal("newPostModal"));
    if (!publishBtn) return;

    publishBtn.addEventListener("click", async () => {
      const ta = safeGet("newPostContent");
      if (!ta) return;
      const content = ta.value.trim();
      if (!content) return alert("Escreva algo!");
      const { data: udata } = await supabase.auth.getUser();
      const user = udata?.user;
      if (!user) return alert("Você precisa estar logado para postar.");

      const { error } = await supabase.from("posts").insert([{ content, user_id: user.id }]);
      if (error) {
        console.error("Erro ao criar post:", error.message || error);
        alert("Erro ao publicar post.");
      } else {
        ta.value = "";
        closeModal("newPostModal");
        await renderPosts();
      }
    });
  }

  // --- REPORT (denúncia) ---
  async function reportPost(postId, reason = "Inapropriado") {
    const { data: udata } = await supabase.auth.getUser();
    const user = udata?.user;
    if (!user) return alert("Você precisa estar logado para denunciar.");
    const { error } = await supabase.from("reports").insert([{ reporter: user.id, post_id: postId, reason }]);
    if (error) {
      console.error("Erro ao denunciar:", error.message || error);
      alert("Erro ao enviar denúncia.");
    } else {
      alert("Denúncia enviada. Obrigado por reportar.");
    }
  }
  window.reportPost = reportPost;

  // --- PROFILE (carregar / salvar) ---
  async function loadProfile() {
    const { data: udata } = await supabase.auth.getUser();
    const user = udata?.user;
    if (!user) return;

    const { data, error } = await supabase.from("profiles").select("display_name, avatar_url, banner_url, role").eq("id", user.id).single();
    if (error) {
      console.warn("Perfil não encontrado (pode ser novo):", error.message || error);
      return;
    }

    // atualiza UI se elementos existem
    if (safeGet("profileName")) safeGet("profileName").innerText = data?.display_name || "Usuário";
    if (safeGet("profileEmail")) safeGet("profileEmail").innerText = user.email || "";
    if (safeGet("profileAvatar") && data?.avatar_url) safeGet("profileAvatar").style.backgroundImage = `url(${data.avatar_url})`;
    if (safeGet("profileBanner") && data?.banner_url) safeGet("profileBanner").style.backgroundImage = `url(${data.banner_url})`;

    // preencher o form se existir
    if (safeGet("displayNameInput")) safeGet("displayNameInput").value = data?.display_name || "";
    if (safeGet("avatarUrlInput")) safeGet("avatarUrlInput").value = data?.avatar_url || "";
    if (safeGet("bannerUrlInput")) safeGet("bannerUrlInput").value = data?.banner_url || "";

    // exibe admin creator se role=admin
    if (data?.role === "admin") {
      const adminEl = safeGet("adminThemeCreator");
      if (adminEl) adminEl.style.display = "block";
    }
  }

  // salvar perfil (upsert)
  function attachProfileSaveHandler() {
    const form = safeGet("profileForm");
    if (!form) return;
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const { data: udata } = await supabase.auth.getUser();
      const user = udata?.user;
      if (!user) return alert("Você precisa estar logado.");

      const updates = {
        id: user.id,
        display_name: safeGet("displayNameInput")?.value || null,
        avatar_url: safeGet("avatarUrlInput")?.value || null,
        banner_url: safeGet("bannerUrlInput")?.value || null,
        updated_at: new Date()
      };

      const { error } = await supabase.from("profiles").upsert(updates, { returning: "minimal" });
      if (error) {
        console.error("Erro ao salvar perfil:", error.message || error);
        alert("Erro ao salvar perfil.");
      } else {
        alert("Perfil atualizado!");
        await loadProfile();
      }
    });
  }

  // --- THEMES ---
  function applyTheme(theme) {
    if (!theme) return;
    if (theme.bgImage) {
      document.body.style.background = `url(${theme.bgImage}) center/cover fixed`;
      document.body.style.backgroundSize = "cover";
    } else {
      document.body.style.background = theme.bgColor || "";
    }
    document.documentElement.style.setProperty("--main-color", theme.color || "");
    try { localStorage.setItem("selectedTheme", JSON.stringify(theme)); } catch (e) {}
  }

  async function loadThemes() {
    const themeList = safeGet("themeList");
    if (!themeList) return;
    themeList.innerHTML = "<div>Carregando temas...</div>";

    const { data, error } = await supabase.from("settings").select("id, value").eq("key", "theme");
    if (error) {
      console.error("Erro ao buscar temas:", error.message || error);
      themeList.innerHTML = "<div>Erro ao carregar temas.</div>";
      return;
    }

    themeList.innerHTML = "";
    (data || []).forEach(row => {
      try {
        const theme = JSON.parse(row.value);
        const b = document.createElement("button");
        b.className = "btn-theme";
        b.textContent = theme.name || "Tema";
        b.style.color = theme.color || "#fff";
        if (theme.bgImage) {
          b.style.backgroundImage = `url(${theme.bgImage})`;
          b.style.backgroundSize = "cover";
          b.style.backgroundPosition = "center";
        } else {
          b.style.background = theme.bgColor || "#444";
        }

        b.addEventListener("mouseenter", () => applyTheme(theme));
        b.addEventListener("mouseleave", () => {
          const saved = localStorage.getItem("selectedTheme");
          if (saved) try { applyTheme(JSON.parse(saved)); } catch (e) {}
        });
        b.addEventListener("click", () => applyTheme(theme));
        themeList.appendChild(b);
      } catch(e) {
        console.warn("Tema inválido", e);
      }
    });

    // Anexa handler do criador de tema (apenas uma vez)
    const cbtn = safeGet("createThemeBtn");
    if (cbtn && !cbtn._orion_attached) {
      cbtn._orion_attached = true;
      cbtn.addEventListener("click", async () => {
        const name = safeGet("themeName")?.value || "Tema";
        const color = safeGet("themeColor")?.value || "#ffffff";
        const bgColor = safeGet("themeBgColor")?.value || "#000000";
        const bgImage = safeGet("themeBgImage")?.value || "";
        const theme = { name, color, bgColor, bgImage };
        const { error } = await supabase.from("settings").insert([{ key: "theme", value: JSON.stringify(theme) }]);
        if (error) {
          console.error("Erro ao salvar tema:", error);
          alert("Erro ao salvar tema.");
        } else {
          alert("Tema criado!");
          await loadThemes();
        }
      });
    }
  }

  // --- PÁGINAS (reader) ---
  let pages = [];
  let currentPageIndex = 0;

  async function loadPages() {
    const frame = safeGet("readerFrame");
    if (!frame) return;
    const { data, error } = await supabase.from("pages").select("id, slug, content_json").order("id", { ascending: true });
    if (error) {
      console.error("Erro ao carregar pages:", error.message || error);
      return;
    }
    pages = data || [];
    currentPageIndex = 0;
    renderPage();
  }

  function renderPage() {
    const frame = safeGet("readerFrame");
    if (!frame) return;
    if (!pages.length) {
      frame.innerHTML = "<div>Sem páginas carregadas.</div>";
      return;
    }
    const page = pages[currentPageIndex];
    if (page.content_json && page.content_json.url) {
      frame.innerHTML = `<iframe src="${page.content_json.url}" class="reader-iframe" style="width:100%;height:600px;border:none"></iframe>`;
    } else {
      frame.innerHTML = `<div class="page-text">${page.content_json ? JSON.stringify(page.content_json) : "Sem conteúdo"}</div>`;
    }
  }

  // prev/next
  (function attachReaderControls() {
    const prev = safeGet("prevPageBtn");
    const next = safeGet("nextPageBtn");
    if (prev) prev.addEventListener("click", () => {
      if (currentPageIndex > 0) { currentPageIndex--; renderPage(); }
    });
    if (next) next.addEventListener("click", () => {
      if (currentPageIndex < pages.length - 1) { currentPageIndex++; renderPage(); }
    });
  })();

  // --- INICIALIZAÇÃO (aplica handlers e carrega dados) ---
  document.addEventListener("DOMContentLoaded", async () => {
    initModals();
    attachNewPostHandler();
    attachProfileSaveHandler();
    await loadThemes();
    await loadPages();
    // render posts aberta
    await renderPosts();
  });

  // Exports para inverter a dep. se HTML chamar funções inline
  window.applyTheme = applyTheme;
  window.renderPosts = renderPosts;
  window.loadPages = loadPages;
  window.openProfile = async (u) => {
    // se u não informado, abre perfil próprio
    if (!u) {
      const { data: ud } = await supabase.auth.getUser();
      u = ud?.user?.id;
      if (!u) return alert("Usuário não encontrado.");
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", u).single();
    if (error) return console.error("Erro abrir perfil:", error.message || error);
    const container = safeGet("profileDetails");
    if (!container) return;
    container.innerHTML = `
      <div class="profile-banner" style="background:url(${data.banner_url || ""}) center/cover; height:120px;"></div>
      <div class="profile-info" style="padding:12px;text-align:center">
        <div style="width:80px;height:80px;margin:-40px auto 8px;border-radius:50%;background:#ddd;background-image:url(${data.avatar_url || ""});background-size:cover"></div>
        <h3>${data.display_name || "Usuário"}</h3>
        <p>Função: ${data.role || "user"}</p>
        <div style="margin-top:8px">
          <button class="btn-main" onclick="(async()=>{ const { data } = await supabase.auth.getUser(); const id = data?.user?.id; if(id) { await supabase.from('friend_requests').insert([{ sender: id, receiver: '${data.id}' }]); alert('Pedido enviado!'); } })()">Adicionar amigo</button>
          <button class="btn-small" onclick="(function(){ reportPost('${data.id}'); })()">Denunciar</button>
        </div>
      </div>
    `;
    openModal("profileModal");
  };

  // logout helper exposto
  window.logout = async function () {
    await supabase.auth.signOut();
    applyLoggedOutUI();
    alert("Você saiu.");
  };

})(); // IIFE end


