// public/app.js — Kasbah Showcase client-side logic

const API = '';

// ── Utility helpers ──────────────────────────────────────────────────────────

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function showAlert(container, type, msg) {
  const el = document.createElement('div');
  el.className = `alert alert-${type} fade-in`;
  el.textContent = msg;
  container.prepend(el);
  setTimeout(() => el.remove(), 4000);
}

function renderJSON(data) {
  return JSON.stringify(data, null, 2);
}

// ── Tasks CRUD ───────────────────────────────────────────────────────────────

async function loadTasks() {
  const res = await fetch(`${API}/api/tasks`);
  const data = await res.json();
  const tbody = $('#tasks-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  (data.tasks || []).forEach(t => {
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.innerHTML = `
      <td><code style="color:var(--muted)">#${t.id}</code></td>
      <td>${escHtml(t.title)}</td>
      <td><span class="tag tag-${t.priority === 'urgent' ? 'urgent' : t.done ? 'done' : 'open'}">${t.priority || (t.done ? 'done' : 'open')}</span></td>
      <td>${escHtml(t.author || 'Anonymous')}</td>
      <td>
        <button class="btn btn-sm ${t.done ? 'btn-ghost' : 'btn-success'}" onclick="toggleTask(${t.id})">
          ${t.done ? '↩ Reopen' : '✓ Done'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})" style="margin-left:.25rem">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
  const counter = $('#task-count');
  if (counter) counter.textContent = data.total;
}

async function createTask(e) {
  e.preventDefault();
  const form = e.target;
  const body = {
    title:    form.title.value.trim(),
    author:   form.author.value.trim() || 'Anonymous',
    priority: form.priority.value
  };
  if (!body.title) return;
  const res = await fetch(`${API}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.ok) { form.reset(); loadTasks(); showAlert($('#tasks-alerts'), 'success', 'Task created!'); }
  else        { showAlert($('#tasks-alerts'), 'error', 'Failed to create task'); }
}

async function toggleTask(id) {
  await fetch(`${API}/api/tasks/${id}/toggle`, { method: 'PATCH' });
  loadTasks();
}

async function deleteTask(id) {
  await fetch(`${API}/api/tasks/${id}`, { method: 'DELETE' });
  loadTasks();
}

// ── Session ──────────────────────────────────────────────────────────────────

async function loadSession() {
  const res = await fetch(`${API}/api/session`);
  const data = await res.json();
  const el = $('#session-data');
  if (el) el.textContent = renderJSON(data);
}

async function clearSession() {
  await fetch(`${API}/api/session`, { method: 'DELETE' });
  loadSession();
  showAlert($('#session-alerts'), 'info', 'Session cleared.');
}

async function setSessionKey(e) {
  e.preventDefault();
  const k = e.target.key.value.trim();
  const v = e.target.value.value.trim();
  if (!k) return;
  await fetch(`${API}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: k, value: v })
  });
  loadSession();
  e.target.reset();
}

// ── Cookies ──────────────────────────────────────────────────────────────────

async function loadCookies() {
  const res = await fetch(`${API}/api/cookies`);
  const data = await res.json();
  const el = $('#cookie-data');
  if (el) el.textContent = renderJSON(data);
}

async function setCookie(e) {
  e.preventDefault();
  await fetch(`${API}/api/cookies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: e.target.cname.value, value: e.target.cval.value })
  });
  loadCookies();
  e.target.reset();
}

async function clearCookies() {
  await fetch(`${API}/api/cookies`, { method: 'DELETE' });
  loadCookies();
}

// ── File upload ───────────────────────────────────────────────────────────────

async function uploadFile(e) {
  e.preventDefault();
  const fileInput = e.target.file;
  if (!fileInput.files.length) return;
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  const el = $('#upload-result');
  if (el) { el.textContent = renderJSON(data); el.parentElement.style.display = 'block'; }
}

// ── Route inspector ───────────────────────────────────────────────────────────

async function testRoute() {
  const method = $('#ri-method').value;
  const path   = $('#ri-path').value.trim() || '/';
  const body   = $('#ri-body').value.trim();
  const start  = Date.now();
  const opts   = { method, headers: {} };
  if (body && method !== 'GET') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = body;
  }
  const res = await fetch(`${API}${path}`, opts);
  const elapsed = Date.now() - start;
  let text;
  try { text = renderJSON(await res.json()); }
  catch { text = await res.text(); }
  const out = $('#ri-output');
  if (out) out.textContent = `HTTP ${res.status} — ${elapsed}ms\n\n${text}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'tasks') {
    loadTasks();
    const form = $('#task-form');
    if (form) form.addEventListener('submit', createTask);
  }

  if (page === 'session') {
    loadSession();
    const form = $('#session-form');
    if (form) form.addEventListener('submit', setSessionKey);
  }

  if (page === 'cookies') {
    loadCookies();
    const form = $('#cookie-form');
    if (form) form.addEventListener('submit', setCookie);
  }

  if (page === 'upload') {
    const form = $('#upload-form');
    if (form) form.addEventListener('submit', uploadFile);
  }

  if (page === 'inspector') {
    const btn = $('#ri-send');
    if (btn) btn.addEventListener('click', testRoute);
  }
});
