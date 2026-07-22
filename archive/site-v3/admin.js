/* Hidden admin page: password gate → review pending posts → export merged posts.json.
   Change the password: run `python scripts/hash_password.py "NewPassword"` and paste below. */
const PASS_HASH = '4cdd5500c84c2eeee81db64af31e95a3bb72b33569a719c3664f0afdbea21f1c';
const PENDING_KEY = 'gz_pending_posts';
const APPROVED_KEY = 'gz_approved_buffer';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getLS(k) { return JSON.parse(localStorage.getItem(k) || '[]'); }
function setLS(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

function renderQueues() {
  const pending = getLS(PENDING_KEY);
  const approved = getLS(APPROVED_KEY);
  const elP = document.getElementById('pending-list');
  const elA = document.getElementById('approved-count');

  elP.innerHTML = pending.length ? pending.map((p, i) => `
    <div class="pending-item">
      <span class="tag">${GZ.esc(p.type)}</span> ${p.remote ? '[remote]' : ''}
      <p style="margin:.4rem 0"><strong>${GZ.esc(p.name)}</strong> · ${GZ.esc(p.date)}</p>
      <p>${GZ.esc(p.text)}</p>
      <div class="actions">
        <button class="btn small" onclick="moderate(${i}, true)">Approve</button>
        <button class="btn small danger" onclick="moderate(${i}, false)">Reject</button>
      </div>
    </div>`).join('') : '<p class="dim">No pending submissions on this device.</p>';

  elA.textContent = approved.length;
}

window.moderate = function (i, ok) {
  const pending = getLS(PENDING_KEY);
  const [post] = pending.splice(i, 1);
  setLS(PENDING_KEY, pending);
  if (ok) { const a = getLS(APPROVED_KEY); a.push(post); setLS(APPROVED_KEY, a); }
  renderQueues();
};

/* Manual add (for Discord/remote submissions you copy in) */
function initManualForm() {
  const form = document.getElementById('manual-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const colors = ['yellow', 'pink', 'blue', 'green', 'orange'];
    const a = getLS(APPROVED_KEY);
    a.push({
      id: 'p-' + Date.now(),
      type: fd.get('type'),
      text: (fd.get('text') || '').toString().trim().slice(0, 280),
      name: (fd.get('name') || 'Anonymous Gamer').toString().trim().slice(0, 40),
      date: GZ.todayISO(),
      remote: fd.get('remote') === 'on',
      color: colors[Math.floor(Math.random() * colors.length)],
      image: (fd.get('image') || '').toString().trim()
    });
    setLS(APPROVED_KEY, a);
    form.reset();
    renderQueues();
  });
}

/* Export: merge live posts.json + approved buffer → download new posts.json */
async function exportPosts() {
  let live = { posts: [] };
  try { const r = await fetch('data/posts.json'); if (r.ok) live = await r.json(); } catch {}
  const approved = getLS(APPROVED_KEY);
  const existing = new Set(live.posts.map(p => p.id));
  approved.forEach(p => { if (!existing.has(p.id)) live.posts.push(p); });

  const blob = new Blob([JSON.stringify(live, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'posts.json';
  a.click();
  URL.revokeObjectURL(a.href);
  document.getElementById('export-note').textContent =
    'Downloaded posts.json — replace data/posts.json in the repo and push. Then click "Clear approved buffer".';
}

document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('gate');
  const panel = document.getElementById('admin-panel');
  document.getElementById('gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('gate-pass').value;
    if (await sha256(pw) === PASS_HASH) {
      gate.style.display = 'none';
      panel.style.display = 'block';
      renderQueues();
      initManualForm();
    } else {
      document.getElementById('gate-err').textContent = 'Nope. (Hint: it is not "password".)';
    }
  });
  document.getElementById('btn-export').addEventListener('click', exportPosts);
  document.getElementById('btn-clear-approved').addEventListener('click', () => {
    if (confirm('Clear the approved buffer? Only do this AFTER committing the exported posts.json.')) {
      setLS(APPROVED_KEY, []);
      renderQueues();
    }
  });
});
