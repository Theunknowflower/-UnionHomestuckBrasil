// Orion final script - Supabase + local fallback
// Replace SUPABASE_URL & SUPABASE_ANON_KEY in index.html before deploy for Supabase integration.

const SUPABASE_URL = window.SUPABASE_URL || "https://vhopcdzemdiqtvrwmqqo.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI";
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = HAS_SUPABASE ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

console.log("Orion script loaded — Supabase:", HAS_SUPABASE);

// ----------------- UI Helpers -----------------
function q(selector, root = document) { return root.querySelector(selector); }
function qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

function openTabById(id) {
  qa('.panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
qa('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab || btn.getAttribute('data-tab') || btn.textContent.toLowerCase();
    if (btn.dataset.tab) openTabById(btn.dataset.tab);
  });
});

// Modal helpers (robust — avoid duplicate definitions)
window.openModal = window.openModal || function(id){
  const m = document.getElementById(id);
  if (!m) return;
  m.setAttribute('aria-hidden', 'false');
  m.style.display = 'flex';
};
window.closeModal = window.closeModal || function(id){
  const m = document.getElementById(id);
  if (!m) return;
  m.setAttribute('aria-hidden', 'true');
  m.style.display = 'none';
};
// attach modal close buttons
document.addEventListener('click', (e) => {
  const close = e.target.closest('[data-close]');
  if (close) {
    const id = close.getAttribute('data-close');
    closeModal(id);
  }
});

// ----------------- Auth -----------------
async function startAuthUI() {
  const loginBtn = document.getElementById('loginWithDiscord');
  const logoutBtn = document.getElementById('logoutBtn');
  const headerUser = document.getElementById('headerUser');
  const avatar = document.getElementById('userAvatar');

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      if (!HAS_SUPABASE) return alert('Supabase não configurado. Coloque as chaves em index.html');
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (HAS_SUPABASE) await supabase.auth.signOut();
      headerUser.innerText = 'Convidado';
      avatar.innerText = 'U';
      loginBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
    });
  }

  if (HAS_SUPABASE) {
    // update UI on auth change
    supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    // try restore session on load
    supabase.auth.getSession().then(r => applySession(r.data?.session));
  } else {
    // local fallback: guest
    headerUser.innerText = 'Convidado';
    avatar.innerText = 'U';
  }
}

function applySession(session) {
  const headerUser = document.getElementById('headerUser');
  const avatar = document.getElementById('userAvatar');
  const loginBtn = document.getElementById('loginWithDiscord');
  const logoutBtn = document.getElementById('logoutBtn');

  if (session?.user) {
    const user = session.user;
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    headerUser.innerText = name;
    avatar.innerText = name[0].toUpperCase();
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    // load profile and roles
    loadProfile();
  } else {
    headerUser.innerText = 'Convidado';
    avatar.innerText = 'U';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

// ----------------- Data storage helpers -----------------
async function dbSelect(table, cols='*', filter=null) {
  if (!HAS_SUPABASE) return [];
  let q = supabase.from(table).select(cols);
  if (filter && filter.col) q = q.eq(filter.col, filter.val);
  const { data, error } = await q;
  if (error) { console.error('DB select error', error); return []; }
  return data || [];
}

async function dbInsert(table, row) {
  if (!HAS_SUPABASE) return { error: { message: 'No DB configured' } };
  return await supabase.from(table).insert([row]);
}

// ----------------- Forum: posts & comments -----------------
async function renderPosts() {
  const forumList = document.getElementById('forumList');
  forumList.innerHTML = '<div class="muted">Carregando...</div>';
  const posts = HAS_SUPABASE ? await dbSelect('posts', 'id, content, created_at, user_id') : [];
  forumList.innerHTML = '';
  (posts || []).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)).forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = `post-${p.id}`;
    const author = p.user_id ? (p.user_id.slice ? p.user_id.slice(0,6) : p.user_id) : 'Usuário';
    card.innerHTML = `
      <div class="post-head"><strong>${author}</strong><small>${new Date(p.created_at).toLocaleString()}</small></div>
      <div class="post-body">${escapeHtml(p.content)}</div>
      <div class="post-actions">
        <button class="btn-gradient" data-post="${p.id}" onclick="togglePostOpen('${p.id}')">💬 Comentários</button>
        <button class="btn-small" onclick="openProfile('${p.user_id}')">Perfil</button>
      </div>
      <div class="comments" id="comments-${p.id}" style="display:none"></div>
    `;
    forumList.appendChild(card);
  });
}

// publish
document.getElementById('publishPostBtn')?.addEventListener('click', async () => {
  const ta = document.getElementById('newPostContent');
  const content = ta?.value?.trim();
  if (!content) return alert('Escreva algo!');
  if (!HAS_SUPABASE) return alert('Para publicar precisa conectar o Supabase');
  const { error } = await dbInsert('posts', { content });
  if (error) { console.error(error); alert('Erro ao publicar'); return; }
  ta.value = '';
  closeModal('newPostModal');
  renderPosts();
});

window.togglePostOpen = async function(postId) {
  const comments = document.getElementById(`comments-${postId}`);
  if (!comments) return;
  const open = comments.style.display === 'block';
  comments.style.display = open ? 'none' : 'block';
  if (!open) await renderComments(postId);
};

async function renderComments(postId) {
  const comments = HAS_SUPABASE ? await dbSelect('comments','id,content,created_at,user_id',{col:'post_id',val:postId}) : [];
  const container = document.getElementById(`comments-${postId}`);
  if (!container) return;
  container.innerHTML = '';
  (comments || []).sort((a,b)=> new Date(a.created_at)-new Date(b.created_at)).forEach(c=>{
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `<strong>${c.user_id?.slice?.(0,6) || 'Usuário'}</strong><p>${escapeHtml(c.content)}</p><small>${new Date(c.created_at).toLocaleString()}</small>`;
    container.appendChild(div);
  });
  // add form
  const form = document.createElement('div');
  form.innerHTML = `<textarea id="commentInput-${postId}" placeholder="Escreva um comentário..."></textarea>
    <button class="btn-small" onclick="addComment('${postId}')">Comentar</button>`;
  container.appendChild(form);
}

window.addComment = async function(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return alert('Escreva algo antes de comentar');
  if (!HAS_SUPABASE) return alert('Comentar requer Supabase configurado');
  const { error } = await dbInsert('comments', { post_id: postId, content });
  if (error) { console.error(error); alert('Erro ao comentar'); return; }
  input.value = '';
  renderComments(postId);
};

// ----------------- Profiles & theme -----------------
async function loadProfile() {
  if (!HAS_SUPABASE) return;
  const { data: me } = await supabase.auth.getUser();
  if (!me?.user) return;
  const id = me.user.id;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!error && data) {
    // optionally set header user (already done by auth handler)
  }
}

window.openProfile = async function(userId) {
  const container = document.getElementById('profileDetails');
  container.innerHTML = '<div>Carregando...</div>';
  if (!HAS_SUPABASE) { container.innerHTML = '<div>Sem DB configurado</div>'; openModal('profileModal'); return; }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) { container.innerHTML = '<div>Erro ao carregar perfil</div>'; openModal('profileModal'); return; }
  container.innerHTML = `
    <div class="profile-banner" style="background-image:url(${escapeAttr(data.banner_url || '')})"></div>
    <div class="profile-info">
      <div class="profile-avatar" style="background-image:url(${escapeAttr(data.avatar_url || '')})">${escapeHtml((data.display_name||'U')[0])}</div>
      <h3>${escapeHtml(data.display_name||'Usuário')}</h3>
      <p>Função: ${escapeHtml(data.role||'user')}</p>
      <div style="margin-top:8px">
        <button class="btn-small" onclick="sendFriendRequest('${data.id}')">Enviar pedido</button>
        <button class="btn-small" onclick="reportUser('${data.id}')">Denunciar</button>
      </div>
    </div>`;
  openModal('profileModal');
};

// basic friend request stub
window.sendFriendRequest = async function(targetId) {
  if (!HAS_SUPABASE) return alert('Requer Supabase');
  const { error } = await dbInsert('friend_requests',{ receiver: targetId });
  if (error) return alert('Erro ao enviar pedido');
  alert('Pedido enviado');
};

// reports stub
window.reportUser = async function(targetId) {
  if (!HAS_SUPABASE) return alert('Requer Supabase');
  const { error } = await dbInsert('reports',{ target_user: targetId, reason: 'Report enviado via UI' });
  if (error) return alert('Erro ao denunciar');
  alert('Denúncia enviada');
};

// Themes
async function loadThemes() {
  const themeList = document.getElementById('themeList');
  if (!themeList) return;
  themeList.innerHTML = '<div class="muted">Carregando temas...</div>';
  if (!HAS_SUPABASE) { themeList.innerHTML = '<div class="muted">Sem temas (DB não configurado)</div>'; return; }
  const { data, error } = await supabase.from('settings').select('id,value').eq('key','theme');
  if (error) { themeList.innerHTML = '<div class="muted">Erro ao carregar</div>'; return; }
  themeList.innerHTML = '';
  (data||[]).forEach(row=>{
    let t;
    try { t = JSON.parse(row.value); } catch(e){ return; }
    const btn = document.createElement('button');
    btn.className = 'btn-theme';
    btn.textContent = t.name||'Tema';
    btn.style.background = t.bgColor || '#444';
    btn.style.color = t.color || '#fff';
    btn.addEventListener('click', () => applyTheme(t));
    themeList.appendChild(btn);
  });
  // admin creator visibility
  try {
    const sess = (await supabase.auth.getUser()).data.user;
    if (sess) {
      const p = await dbSelect('profiles','role',{col:'id',val:sess.id});
      if (p && p[0] && p[0].role === 'admin') {
        document.getElementById('adminThemeCreator').style.display = 'block';
      }
    }
  } catch(e){}
}

document.getElementById('createThemeBtn')?.addEventListener('click', async () => {
  if (!HAS_SUPABASE) return alert('Requer Supabase');
  const theme = {
    name: document.getElementById('themeName').value || 'Tema',
    color: document.getElementById('themeColor').value || '#fff',
    bgColor: document.getElementById('themeBgColor')?.value || '#000',
    bgImage: document.getElementById('themeBgImage')?.value || ''
  };
const { error } = await supabase.from("settings").insert([
  { key: "theme", value: theme }
]);

  if (error) return alert('Erro ao salvar tema');
  loadThemes();
});

function applyTheme(theme) {
  if (!theme) return;
  if (theme.bgImage) {
    document.body.style.background = `url(${theme.bgImage}) center/cover fixed`;
  } else {
    document.body.style.background = theme.bgColor || '';
  }
  document.documentElement.style.setProperty('--main-color', theme.color || '#2e7d32');
  try { localStorage.setItem('selectedTheme', JSON.stringify(theme)); } catch(e){}
}

// Pages reader (uses /pages table)
let pages = [];
let currentPageIndex = 0;
async function loadPages() {
  if (!HAS_SUPABASE) return;
  const { data, error } = await supabase.from('pages').select('id,slug,content_json').order('id',{ascending:true});
  if (error) return console.error('Erro pages', error);
  pages = data || [];
  currentPageIndex = 0;
  renderPage();
}
function renderPage() {
  const frame = document.getElementById('readerFrame');
  if (!pages.length) { frame.innerHTML = '<div class="reader-placeholder">Nenhuma página</div>'; return; }
  const p = pages[currentPageIndex];
  if (p?.content_json?.url) {
    frame.innerHTML = `<iframe src="${escapeAttr(p.content_json.url)}" class="reader-iframe" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`;
  } else {
    frame.innerHTML = `<div class="page-text">${escapeHtml(JSON.stringify(p.content_json||{}))}</div>`;
  }
}
document.getElementById('prevPageBtn')?.addEventListener('click', ()=>{ if (currentPageIndex>0){ currentPageIndex--; renderPage(); }});
document.getElementById('nextPageBtn')?.addEventListener('click', ()=>{ if (currentPageIndex < pages.length-1){ currentPageIndex++; renderPage(); }});

// utils
function escapeHtml(s){ if (!s && s!==0) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return String(s||'').replace(/"/g,'&quot;'); }

// initialize
document.addEventListener('DOMContentLoaded', async () => {
  await startAuthUI();
  loadThemes();
  renderPosts();
  if (HAS_SUPABASE) { loadPages(); }
});
