/* Graffiti Wall v2: flat icons, renders approved posts, local pending queue. */
const WALL_TYPE_ICON = { note: 'note', meme: 'laugh', prize: 'trophy', lfg: 'gamepad', tech: 'wrench' };
const PENDING_KEY = 'gz_pending_posts';

function stickyHTML(p) {
  return `<div class="sticky ${p.image ? 'has-photo ' : ''}c-${GZ.esc(p.color || 'yellow')}" data-type="${GZ.esc(p.type)}">
    <span class="badges">${p.remote ? GZ.icon('globe') : ''}${GZ.icon(WALL_TYPE_ICON[p.type] || 'note')}</span>
    ${GZ.esc(p.text)}
    ${p.image ? `<img src="${GZ.esc(p.image)}" alt="Post image" loading="lazy">` : ''}
    <span class="who">— ${GZ.esc(p.name)} · ${GZ.esc(p.date)}</span>
  </div>`;
}

async function renderWall() {
  const el = document.getElementById('wall-grid');
  const hl = document.getElementById('home-wall-highlights');
  if (!el && !hl) return;
  try {
    const r = await fetch('data/posts.json');
    const data = await r.json();
    const posts = (data.posts || []).slice().reverse();
    if (el) el.innerHTML = posts.length ? posts.map(stickyHTML).join('') : '<p class="dim">Be the first to post on the Bulletin.</p>';
    if (hl) hl.innerHTML = posts.slice(0, 3).map(stickyHTML).join('');
  } catch { if (el) el.innerHTML = '<p class="dim">The wall is loading…</p>'; }
}

function initFilters() {
  const chips = document.querySelectorAll('.filter-row .chip');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const t = chip.dataset.filter;
    document.querySelectorAll('#wall-grid .sticky').forEach(s => {
      s.style.display = (t === 'all' || s.dataset.type === t) ? '' : 'none';
    });
  }));
}

function initSubmitForm() {
  const form = document.getElementById('wall-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const text = (fd.get('text') || '').toString().trim().slice(0, 280);
    const name = (fd.get('name') || 'Anonymous Gamer').toString().trim().slice(0, 40);
    if (!text) return;
    const colors = ['yellow', 'pink', 'blue', 'green', 'orange'];
    const post = {
      id: 'p-' + Date.now(),
      type: fd.get('type') || 'note',
      text, name,
      date: GZ.todayISO(),
      remote: fd.get('remote') === 'on',
      color: colors[Math.floor(Math.random() * colors.length)],
      image: ''
    };
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    pending.push(post);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    form.reset();
    const flash = document.getElementById('wall-flash');
    if (flash) { flash.classList.add('show'); setTimeout(() => flash.classList.remove('show'), 6000); }
  });
}

document.addEventListener('DOMContentLoaded', () => { renderWall(); initFilters(); initSubmitForm(); });
