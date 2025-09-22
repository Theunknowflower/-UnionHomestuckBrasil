// assets/js/script.js
// Orion unified script - Supabase v2 (client global from CDN)
(() => {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://vhopcdzemdiqtvrwmqqo.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI';
  if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase client missing or keys not set.');
  }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // small helpers
  const $ = (id) => document.getElementById(id);
  function show(el) { if (!el) return; el.style.display = ''; el.setAttribute('aria-hidden','false'); }
  function hide(el) { if (!el) return; el.style.display = 'none'; el.setAttribute('aria-hidden','true'); }

  // modal API
  window.openModal = function(id) {
    const m = $(id);
    if (!m) return;
    m.setAttribute('aria-hidden','false');
    m.style.display = 'flex';
    const focusable = m.querySelector('button, input, textarea');
    if (focusable) focusable.focus();
  };
  window.closeModal = function(id) {
    const m = $(id);
    if (!m) return;
    m.setAttribute('aria-hidden','true');
    m.style.display = 'none';
  };

  // ensure modals hidden on load and attach close handlers
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(m => {
      m.setAttribute('aria-hidden','true'); m.style.display = 'none';
    });
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal && modal.id) closeModal(modal.id);
      });
    });
    // close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal[aria-hidden="false"]').forEach(m => closeModal(m.id));
      }
    });
  });

  // UI elements
  const loginBtn = $('loginWithDiscord');
  const logoutBtn = $('logoutBtn');
  const headerUser = $('headerUser');
  const avatar = $('userAvatar');
  const openNewPostBtn = $('openNewPostBtn');
  const publishPostBtn = $('publishPostBtn');
  const openThemeModalBtn = $('openThemeModalBtn');
  const createThemeBtn = $('createThemeBtn');

  // Auth: login/logout
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      // redirectTo should point back to the current page path (works with GitHub Pages)
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo }
      });
      if (error) console.error('Erro login Discord:', error.message);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      setLoggedOutUI();
    });
  }

  // ensure profile exists: create profile row when first login
  async function ensureProfile(user) {
    if (!user) return;
    try {
      const { data } = await sb.from('profiles').select('id').eq('id', user.id).single();
      if (!data) {
        const display_name = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Usuário');
        await sb.from('profiles').insert([{ id: user.id, display_name }]);
      }
    } catch (e) {
      // if single() throws because not found it's ok; use upsert fallback
      try {
        const display_name = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Usuário');
        await sb.from('profiles').upsert({ id: user.id, display_name });
      } catch (err) {
        console.warn('ensureProfile failed', err);
      }
    }
  }

  function setLoggedInUI(user) {
    const display = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Usuário');
    if (headerUser) headerUser.innerText = display;
    if (avatar) avatar.innerText = display[0]?.toUpperCase() || 'U';
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
  }

  function setLoggedOutUI() {
    if (headerUser) headerUser.innerText = 'Convidado';
    if (avatar) avatar.innerText = 'U';
    if (loginBtn) loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  // on auth change
  async function handleAuth(session) {
    const user = session?.user || null;
    if (user) {
      await ensureProfile(user);
      setLoggedInUI(user);
    } else {
      setLoggedOutUI();
    }
  }

  // initial auth state + subscription
  (async () => {
    try {
      const s = await sb.auth.getSession();
      await handleAuth(s?.data?.session);
    } catch (e) { console.warn('getSession failed', e); }
    sb.auth.onAuthStateChange((event, session) => handleAuth(session));
  })();

  // ------------------ POSTS & COMMENTS ------------------
  async function renderPosts() {
    const list = $('forumList');
    if (!list) return;
    list.innerHTML = '<div>Carregando posts...</div>';

    const { data: posts, error } = await sb
      .from('posts')
      .select('id, content, created_at, user_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro carregar posts:', error);
      list.innerHTML = '<div>Erro ao carregar posts.</div>';
      return;
    }

    list.innerHTML = '';
    if (!posts || posts.length === 0) {
      list.innerHTML = '<div>Nenhum post ainda.</div>';
      return;
    }

    // get unique user ids and fetch profiles
    const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
      const { data } = await sb.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
      profiles = data || [];
    }
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    posts.forEach(p => {
      const author = profileMap[p.user_id]?.display_name || 'Usuário';
      const card = document.createElement('div');
      card.className = 'post-card';
      card.id = `post-${p.id}`;
      card.innerHTML = `
        <div class="post-head">
          <strong>${escapeHtml(author)}</strong>
          <small>${new Date(p.created_at).toLocaleString()}</small>
        </div>
        <div class="post-body">${escapeHtml(p.content)}</div>
        <div class="post-actions">
          <button class="btn-gradient" data-post="${p.id}" data-action="toggle-comments">💬 Comentários</button>
          <button class="btn-small" data-post="${p.id}" data-action="report">🚩 Denunciar</button>
          <button class="btn-small" data-post="${p.id}" data-action="open-profile">👤 Perfil</button>
        </div>
        <div class="comments" id="comments-${p.id}" style="display:none"></div>
      `;
      list.appendChild(card);
    });

    // attach delegated handlers for comment toggle, report, open profile
    list.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        const postId = btn.getAttribute('data-post');
        if (action === 'toggle-comments') togglePostOpen(postId);
        if (action === 'report') reportPost(postId);
        if (action === 'open-profile') openProfileByPost(postId);
      });
    });
  }

  // toggle comments / load them
  async function togglePostOpen(postId) {
    const commentsEl = $(`comments-${postId}`);
    if (!commentsEl) return;
    const visible = commentsEl.style.display === 'block';
    if (visible) {
      commentsEl.style.display = 'none';
      return;
    }
    // load comments
    await renderComments(postId);
    commentsEl.style.display = 'block';
  }
  window.togglePostOpen = togglePostOpen;

  async function renderComments(postId) {
    const commentsEl = $(`comments-${postId}`);
    if (!commentsEl) return;
    commentsEl.innerHTML = '<div>Carregando comentários...</div>';

    const { data: comments, error } = await sb
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar comentários:', error);
      commentsEl.innerHTML = '<div>Erro ao carregar comentários.</div>';
      return;
    }

    // fetch profiles of commenters
    const uids = [...new Set((comments||[]).map(c => c.user_id).filter(Boolean))];
    let profiles = [];
    if (uids.length) {
      const { data } = await sb.from('profiles').select('id, display_name').in('id', uids);
      profiles = data || [];
    }
    const profMap = Object.fromEntries((profiles||[]).map(p => [p.id, p]));

    commentsEl.innerHTML = '';
    (comments || []).forEach(c => {
      const author = profMap[c.user_id]?.display_name || 'Usuário';
      const d = document.createElement('div');
      d.className = 'comment';
      d.innerHTML = `<strong>${escapeHtml(author)}</strong>
                     <p>${escapeHtml(c.content)}</p>
                     <small>${new Date(c.created_at).toLocaleString()}</small>`;
      commentsEl.appendChild(d);
    });

    // add comment form
    const form = document.createElement('div');
    form.innerHTML = `
      <textarea id="commentInput-${postId}" placeholder="Escreva um comentário..." style="width:100%;height:70px"></textarea>
      <div style="margin-top:6px"><button class="btn-main" id="sendCommentBtn-${postId}">Comentar</button></div>
    `;
    commentsEl.appendChild(form);
    $(`sendCommentBtn-${postId}`).addEventListener('click', () => addComment(postId));
  }
  window.renderComments = renderComments;

  async function addComment(postId) {
    const input = $(`commentInput-${postId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content) { alert('Escreva algo antes de comentar!'); input.focus(); return; }

    const userRes = await sb.auth.getUser();
    const user = userRes?.data?.user;
    if (!user) { alert('Você precisa estar logado para comentar.'); return; }

    const { error } = await sb.from('comments').insert([{ post_id: postId, user_id: user.id, content }]);
    if (error) {
      console.error('Erro ao inserir comentário:', error);
      alert('Erro ao salvar comentário.');
    } else {
      input.value = '';
      renderComments(postId);
    }
  }
  window.addComment = addComment;

  // create new post
  if (openNewPostBtn) {
    openNewPostBtn.addEventListener('click', () => openModal('newPostModal'));
  }
  if (publishPostBtn) {
    publishPostBtn.addEventListener('click', async () => {
      const textarea = $('newPostContent');
      const content = textarea.value.trim();
      if (!content) return alert('Escreva algo!');
      const userRes = await sb.auth.getUser();
      const user = userRes?.data?.user;
      if (!user) return alert('Você precisa estar logado para postar.');

      const { error } = await sb.from('posts').insert([{ content, user_id: user.id }]);
      if (error) {
        console.error('Erro ao criar post:', error);
        alert('Erro ao publicar post.');
      } else {
        textarea.value = '';
        closeModal('newPostModal');
        await renderPosts();
      }
    });
  }

  // report post
  async function reportPost(postId, reason='Inapropriado') {
    const userRes = await sb.auth.getUser();
    const user = userRes?.data?.user;
    if (!user) return alert('Você precisa estar logado para denunciar.');
    const { error } = await sb.from('reports').insert([{ reporter: user.id, post_id: postId, reason }]);
    if (error) {
      console.error('Erro ao denunciar:', error);
      alert('Erro ao enviar denúncia.');
    } else {
      alert('Denúncia enviada. Obrigado.');
    }
  }
  window.reportPost = reportPost;

  // open profile by post -> open profile modal
  async function openProfileByPost(postId){
    const { data: post } = await sb.from('posts').select('user_id').eq('id', postId).single();
    if (post?.user_id) openProfile(post.user_id);
  }

  // openProfile(userId) loads profile modal
  async function openProfile(userId){
    if (!userId) return;
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error) { console.error('Erro ao carregar perfil:', error); return; }
    const container = $('profileDetails');
    container.innerHTML = `
      <div class="profile-banner" style="background-image:url(${escapeAttr(data.banner_url||'')});height:120px;background-size:cover;background-position:center"></div>
      <div class="profile-info">
        <div class="profile-avatar">${escapeHtml((data.display_name||'U')[0] || 'U')}</div>
        <h3>${escapeHtml(data.display_name || 'Usuário')}</h3>
        <p>Função: ${escapeHtml(data.role || 'user')}</p>
        <div style="margin-top:8px">
          <button class="btn-small" id="sendFriendBtn">Enviar pedido</button>
          <button class="btn-small" id="reportUserBtn">Denunciar</button>
        </div>
      </div>
    `;
    $('sendFriendBtn')?.addEventListener('click', () => alert('Função de amizade pendente de implementação.'));
    $('reportUserBtn')?.addEventListener('click', async () => {
      await reportUser(userId);
    });
    openModal('profileModal');
  }
  window.openProfile = openProfile;

  async function reportUser(userId) {
    const userRes = await sb.auth.getUser();
    const user = userRes?.data?.user;
    if (!user) return alert('Você precisa estar logado para denunciar.');
    const { error } = await sb.from('reports').insert([{ reporter: user.id, target_user: userId, reason: 'Inapropriado' }]);
    if (error) {
      console.error('Erro ao denunciar usuário:', error);
      alert('Erro ao enviar denúncia.');
    } else {
      alert('Denúncia enviada ao admin.');
      closeModal('profileModal');
    }
  }

  // ------------------ THEMES ------------------
  async function loadThemes() {
    const themeList = $('themeList');
    if (!themeList) return;
    themeList.innerHTML = 'Carregando temas...';
    const { data, error } = await sb.from('settings').select('id,value').eq('key','theme');
    if (error) {
      console.error('Erro ao carregar temas:', error);
      themeList.innerHTML = 'Erro ao carregar temas';
      return;
    }
    themeList.innerHTML = '';
    (data||[]).forEach(row => {
      let theme;
      try { theme = JSON.parse(row.value); } catch (e) { return; }
      const btn = document.createElement('button');
      btn.className = 'btn-theme';
      btn.textContent = theme.name || 'Tema';
      btn.style.background = theme.bgColor || '#444';
      btn.style.color = theme.color || '#fff';
      if (theme.bgImage) {
        btn.style.backgroundImage = `url(${theme.bgImage})`;
        btn.style.backgroundSize = 'cover';
        btn.style.backgroundPosition = 'center';
      }
      btn.addEventListener('mouseenter', () => applyTheme(theme));
      btn.addEventListener('mouseleave', () => {
        const saved = localStorage.getItem('selectedTheme');
        if (saved) try { applyTheme(JSON.parse(saved)); } catch(e){ }
      });
      btn.addEventListener('click', () => {
        applyTheme(theme);
        try { localStorage.setItem('selectedTheme', JSON.stringify(theme)); } catch(e){}
      });
      themeList.appendChild(btn);
    });

    // show admin creator if admin
    try {
      const userRes = await sb.auth.getUser();
      const user = userRes?.data?.user;
      if (user) {
        const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single();
        if (prof?.role === 'admin') {
          const adminCreator = $('adminThemeCreator');
          if (adminCreator) adminCreator.style.display = '';
          if (createThemeBtn) attachCreateThemeHandler();
        }
      }
    } catch(e){ console.warn('loadThemes admin check failed', e); }
  }

  function applyTheme(theme) {
    if (!theme) return;
    if (theme.bgImage) {
      document.body.style.background = `url(${theme.bgImage}) center/cover fixed`;
      document.body.style.backgroundSize = 'cover';
    } else {
      document.body.style.background = theme.bgColor || '';
    }
    document.documentElement.style.setProperty('--main-color', theme.color || '');
    try { localStorage.setItem('selectedTheme', JSON.stringify(theme)); } catch(e){}
  }

  function attachCreateThemeHandler() {
    if (!createThemeBtn) return;
    if (createThemeBtn._attached) return;
    createThemeBtn._attached = true;
    createThemeBtn.addEventListener('click', async () => {
      const theme = {
        name: $('themeName')?.value || 'Tema',
        color: $('themeColor')?.value || '#ffffff',
        bgColor: $('themeBgColor')?.value || '#000000',
        bgImage: $('themeBgImage')?.value || ''
      };
      const { error } = await sb.from('settings').insert([{ key: 'theme', value: JSON.stringify(theme) }]);
      if (error) {
        console.error('Erro salvar tema', error);
        alert('Erro ao salvar tema.');
      } else {
        alert('Tema criado!');
        loadThemes();
      }
    });
  }

  // ------------------ PAGES (reader) ------------------
  let pages = [];
  let currentPageIndex = 0;

  async function loadPages() {
    const { data, error } = await sb.from('pages').select('id, slug, content_json').order('id', { ascending: true });
    if (error) { console.error('Erro carregar pages:', error); return; }
    pages = data || [];
    currentPageIndex = 0;
    renderPage();
    renderPagesIndex();
  }

  function renderPage() {
    const frame = $('readerFrame');
    if (!frame) return;
    if (!pages.length) { frame.innerHTML = '<div class="reader-placeholder">Nenhuma página disponível</div>'; return; }
    const page = pages[currentPageIndex];
    if (page.content_json && page.content_json.url) {
      frame.innerHTML = `<iframe src="${escapeAttr(page.content_json.url)}" class="reader-iframe" title="Página ${page.slug}"></iframe>`;
    } else {
      frame.innerHTML = `<div class="page-text">${escapeHtml(JSON.stringify(page.content_json || page.slug))}</div>`;
    }
  }

  function renderPagesIndex() {
    const idx = $('pagesIndex');
    if (!idx) return;
    idx.innerHTML = '';
    pages.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'btn-small';
      b.textContent = `${p.slug || `Página ${p.id}`}`;
      b.addEventListener('click', () => { currentPageIndex = i; renderPage(); openTab('ler'); });
      idx.appendChild(b);
    });
  }

  $('prevPageBtn')?.addEventListener('click', () => { if (currentPageIndex>0) { currentPageIndex--; renderPage(); }});
  $('nextPageBtn')?.addEventListener('click', () => { if (currentPageIndex < pages.length-1) { currentPageIndex++; renderPage(); }});

  // ------------------ PROFILE EDIT ------------------
  // load profile into side-panel when logged
  async function loadProfileToPanel() {
    const userRes = await sb.auth.getUser();
    const user = userRes?.data?.user;
    if (!user) return;
    const { data } = await sb.from('profiles').select('display_name, avatar_url, banner_url').eq('id', user.id).single();
    if (!data) return;
    // fill panel if elements exist (index.html may not have those fields)
    const nameEl = $('profileName'); if (nameEl) nameEl.innerText = data.display_name || 'Usuário';
    const emailEl = $('profileEmail'); if (emailEl) emailEl.innerText = user.email || '';
    const av = $('profileAvatar'); if (av) { av.style.backgroundImage = data.avatar_url ? `url(${data.avatar_url})` : ''; av.innerText = (data.display_name||'U')[0]; }
    const banner = $('profileBanner'); if (banner) banner.style.backgroundImage = data.banner_url ? `url(${data.banner_url})` : '';
  }

  // profile form submit
  document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'profileForm') {
      e.preventDefault();
      const userRes = await sb.auth.getUser();
      const user = userRes?.data?.user;
      if (!user) return alert('Você precisa estar logado.');
      const updates = {
        id: user.id,
        display_name: $('displayNameInput')?.value || '',
        avatar_url: $('avatarUrlInput')?.value || '',
        banner_url: $('bannerUrlInput')?.value || '',
        updated_at: new Date().toISOString()
      };
      const { error } = await sb.from('profiles').upsert(updates);
      if (error) { console.error('Erro salvar perfil', error); alert('Erro ao salvar perfil.'); }
      else { alert('Perfil salvo!'); loadProfileToPanel(); }
    }
  });

  // ------------------ UTIL ------------------
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function escapeAttr(s){ return s? s.replace(/"/g,'&quot;') : ''; }

  // initial load
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadThemes(), renderPosts(), loadPages()]);
    // theme button opens modal
    openThemeModalBtn?.addEventListener('click', () => openModal('themeModal'));
    // ensure createTheme handler attached if admin later
    // periodically refresh posts (optional)
    setInterval(() => renderPosts().catch(()=>{}), 60_000);
  });

  // expose some helpers for debugging
  window.sb = sb;
  window.renderPosts = renderPosts;
  window.loadPages = loadPages;
})();


