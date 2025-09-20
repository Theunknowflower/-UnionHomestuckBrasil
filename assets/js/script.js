// Frontend logic (rewrite final) - set SUPABASE_URL and SUPABASE_ANON_KEY in your page before loading this script
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = window.SUPABASE_URL || 'https://vhopcdzemdiqtvrwmqqo.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob3BjZHplbWRpcXR2cndtcXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjc2MTUsImV4cCI6MjA3MzgwMzYxNX0.j8podlPF9lBz2LfzDq1Z0NYF2QA3tQRK-tOIalWz2sI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById('loginDiscordBtn');
const headerUser = document.getElementById('headerUser');
const userAvatar = document.getElementById('userAvatar');
const openForumSidebarBtn = document.getElementById('openForumSidebarBtn');
const forumSidebar = document.getElementById('forumSidebar');
const closeForumBtn = document.getElementById('closeForumBtn');
const forumList = document.getElementById('forumList');

let currentUser = null;
let currentProfile = null;
let postsCache = [];

// Auth handlers
loginBtn.addEventListener('click', async ()=>{
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'discord' });
  if(error) console.error(error);
});

supabase.auth.onAuthStateChange(async (_event, session)=>{
  if(session?.user){
    currentUser = session.user;
    headerUser.textContent = session.user.user_metadata?.full_name || session.user.email || 'Usuário';
    userAvatar.textContent = (session.user.user_metadata?.full_name || 'U')[0].toUpperCase();
    await ensureProfile(session.user);
    await loadSettings();
    await loadPosts();
  } else {
    currentUser = null;
    headerUser.textContent = 'Convidado';
    userAvatar.textContent = 'U';
  }
});

async function ensureProfile(user){
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single().catch(()=>({data:null}));
  if(!data){
    await supabase.from('profiles').insert([{ id: user.id, display_name: user.user_metadata?.full_name || user.email }]);
  }
}

openForumSidebarBtn?.addEventListener('click', ()=> { forumSidebar.classList.add('open'); forumSidebar.setAttribute('aria-hidden','false'); loadPosts(); });
closeForumBtn?.addEventListener('click', ()=> { forumSidebar.classList.remove('open'); forumSidebar.setAttribute('aria-hidden','true'); });

export async function loadPosts(){
  const { data, error } = await supabase.from('posts').select('id, user_id, content, created_at, deleted, profiles(display_name)').order('created_at',{ascending:false});
  if(error){ console.error(error); return; }
  postsCache = data || [];
  renderPosts(postsCache);
}

function renderPosts(posts){
  forumList.innerHTML = '';
  posts.forEach(p=>{
    if(p.deleted && !isAdmin()) return;
    const el = document.createElement('div');
    el.style.padding='8px 0';
    el.style.borderBottom='1px solid #eee';
    el.innerHTML = `<strong>${escapeHtml(p.profiles?.display_name||'Usuário')}</strong><div>${escapeHtml(p.content)}</div><div style="margin-top:6px"><button onclick="viewPost('${p.id}')">Ver</button> <button onclick="likePost('${p.id}')">Curtir</button> ${canModifyPost(p)? `<button onclick="toggleDeletePost('${p.id}')">${p.deleted? 'Restaurar':'Apagar'}</button>`: ''} <button onclick="openProfile('${p.user_id}')">Perfil</button></div>`;
    forumList.appendChild(el);
  });
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function canModifyPost(post){ if(!currentUser) return false; return currentUser.id === post.user_id || isAdmin(); }
function isAdmin(){ return currentProfile?.role === 'admin'; }

window.viewPost = async function(postId){
  const { data: post } = await supabase.from('posts').select('*, profiles(display_name)').eq('id', postId).single();
  if(!post) return alert('Post não encontrado');
  const modal = document.getElementById('profileModal');
  modal.setAttribute('aria-hidden','false');
  document.getElementById('profileDetails').innerHTML = `<h3>${escapeHtml(post.profiles?.display_name||'Usuário')}</h3><p>${escapeHtml(post.content)}</p><div id="postComments"></div><textarea id="newCommentText" style="width:100%;height:80px"></textarea><br><button onclick="addComment('${postId}')">Comentar</button>`;
  const { data: comments } = await supabase.from('comments').select('*, profiles(display_name)').eq('post_id', postId).order('created_at',{ascending:true});
  const cDiv = document.getElementById('postComments');
  cDiv.innerHTML='';
  (comments||[]).forEach(c=>{ if(c.deleted && !isAdmin()) return; const d=document.createElement('div'); d.style.padding='6px 0'; d.innerHTML = `<strong>${escapeHtml(c.profiles?.display_name||'U')}</strong>: ${escapeHtml(c.content)} ${ (currentUser && (currentUser.id===c.user_id || isAdmin())) ? `<button onclick="toggleDeleteComment('${c.id}')">${c.deleted? 'Restaurar':'Apagar'}</button>` : '' }`; cDiv.appendChild(d); });
};

window.closeProfile = ()=>{ document.getElementById('profileModal').setAttribute('aria-hidden','true'); document.getElementById('profileDetails').innerHTML=''; }

window.addComment = async function(postId){
  const text = document.getElementById('newCommentText').value;
  if(!currentUser) return alert('Faça login');
  await supabase.from('comments').insert([{ post_id: postId, user_id: currentUser.id, content: text }]);
  viewPost(postId);
}

window.likePost = async function(postId){
  if(!currentUser) return alert('Faça login');
  await supabase.from('post_likes').insert([{ post_id: postId, user_id: currentUser.id }]).catch(()=>{});
  alert('Curtiu');
}

window.toggleDeletePost = async function(postId){
  const post = postsCache.find(p=>p.id===postId);
  if(!post) return;
  if(isAdmin()){ await supabase.from('posts').delete().eq('id', postId); } else { await supabase.from('posts').update({ deleted: !post.deleted }).eq('id', postId); }
  loadPosts();
}

window.toggleDeleteComment = async function(commentId){
  const { data: comment } = await supabase.from('comments').select('*').eq('id', commentId).single();
  if(!comment) return;
  if(isAdmin()){ await supabase.from('comments').delete().eq('id', commentId); } else { await supabase.from('comments').update({ deleted: !comment.deleted }).eq('id', commentId); }
  if(comment.post_id) viewPost(comment.post_id);
}

window.openProfile = async function(userId){
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if(!profile) return alert('Perfil não encontrado');
  currentProfile = profile;
  const modal = document.getElementById('profileModal');
  modal.setAttribute('aria-hidden','false');
  document.getElementById('profileDetails').innerHTML = `<img src="${profile.banner_url||''}" style="width:100%;height:120px;object-fit:cover"/><h3>${escapeHtml(profile.display_name||'Usuário')}</h3><img src="${profile.avatar_url||''}" style="width:80px;height:80px;border-radius:50%"><div><button onclick="sendFriendRequest('${profile.id}')">Enviar pedido de amizade</button><button onclick="reportUser('${profile.id}')">Denunciar</button></div>`;
}

window.sendFriendRequest = async function(targetId){
  if(!currentUser) return alert('Faça login');
  await supabase.from('friend_requests').insert([{ requester_id: currentUser.id, recipient_id: targetId }]);
  alert('Pedido enviado');
}

window.reportUser = async function(targetId){
  if(!currentUser) return alert('Faça login');
  const reason = prompt('Motivo da denúncia:');
  if(!reason) return;
  await supabase.from('reports').insert([{ user_id: currentUser.id, reported_user_id: targetId, reason }]);
  alert('Denúncia enviada');
}

async function loadSettings(){
  const { data } = await supabase.from('settings').select('*').eq('id',1).single().catch(()=>({data:null}));
  if(data) applySettings(data);
  if(currentUser){
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if(profile?.role === 'admin'){ document.body.classList.add('is-admin'); }
  }
}

function applySettings(s){
  if(s.background_image) document.body.style.backgroundImage = `url(${s.background_image})`; else if(s.background_color) document.body.style.backgroundColor = s.background_color;
  if(s.topbar_color) document.querySelector('header').style.backgroundColor = s.topbar_color;
}

document.getElementById('saveAdminSettingsBtn')?.addEventListener('click', async ()=>{
  if(!currentUser) return alert('Faça login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  if(profile?.role !== 'admin') return alert('Apenas admins podem alterar');
  const topbar = document.getElementById('adminTopbarColor').value;
  const bgc = document.getElementById('adminBgColor').value;
  const bgi = document.getElementById('adminBgImage').value;
  await supabase.from('settings').upsert([{ id:1, topbar_color: topbar, background_color: bgc, background_image: bgi }]);
  alert('Salvo'); loadSettings();
});

// initial
loadPosts();
loadSettings();
export { loadPosts };
