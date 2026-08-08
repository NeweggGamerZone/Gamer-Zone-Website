/* Shared v2: flat icon set, config fill, nav, scroll reveal, parallax, tilt, lightbox. */
const GZ_ICONS = {
  pc: '<path d="M2 3h20v13H2zm2 2v9h16V5zM8 18h8l1 3H7z"/>',
  wheel: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 016.7 5H14a2.5 2.5 0 00-4 0H5.3A7 7 0 0112 5zm-6.7 7h4.2l-2.1 5.1A7 7 0 015.3 12zm9.2 0h4.2a7 7 0 01-2.1 5.1zM12 13.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>',
  vr: '<path d="M3 6h18a1 1 0 011 1v8a1 1 0 01-1 1h-5l-2-2h-4l-2 2H3a1 1 0 01-1-1V7a1 1 0 011-1zm4 3a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z"/>',
  trophy: '<path d="M7 3h10v2h3a1 1 0 011 1v1a5 5 0 01-5 5c-.7 1.5-1.9 2.7-3.5 3.3V18H15a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1a1 1 0 011-1h2.5v-2.7C9.9 14.7 8.7 13.5 8 12A5 5 0 013 7V6a1 1 0 011-1h3V3zM5 7a3 3 0 003 3.9A9 9 0 017 7H5zm14 0h-2a9 9 0 01-1 3.9A3 3 0 0019 7z"/>',
  snack: '<path d="M7 2l1.5 4H5L3 22h18L19 6h-3.5L17 2h-2l-1.5 4h-3L9 2zm1 8h2v8H8zm4 0h2v8h-2z"/>',
  wrench: '<path d="M21 6.5a5.5 5.5 0 01-7.3 5.2L7 18.4A2.5 2.5 0 113.6 15l6.7-6.7A5.5 5.5 0 0117.5 1L14 4.5 15.5 8 19 6.5z"/>',
  pin: '<path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 4a3 3 0 100 6 3 3 0 000-6z"/>',
  clock: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5.6l4 2.3-1 1.7-5-2.9V7z"/>',
  ticket: '<path d="M3 7h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4zm9 1v2h2V8zm0 4v2h2v-2z"/>',
  users: '<path d="M8 4a4 4 0 110 8 4 4 0 010-8zm8 2a3 3 0 110 6 3 3 0 010-6zM8 14c3 0 7 1.5 7 4.5V21H1v-2.5C1 15.5 5 14 8 14zm8 1c2.4 0 7 1.2 7 3.5V21h-6v-2.5c0-1.4-.6-2.5-1.6-3.4z"/>',
  chat: '<path d="M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2zm3 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>',
  cal: '<path d="M7 2v2H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1h-3V2h-2v2H9V2zM5 9h14v10H5zm2 2v2h3v-2zm5 0v2h3v-2z"/>',
  note: '<path d="M20.7 5.6l-2.3-2.3a1 1 0 00-1.4 0L4 16.3V20h3.7l13-13a1 1 0 000-1.4zM6.9 18H6v-.9l9.6-9.6.9.9zM3 22h18v-2H3z"/>',
  laugh: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zM8 8.5A1.5 1.5 0 119.5 10 1.5 1.5 0 018 8.5zm6.5 0A1.5 1.5 0 1116 10a1.5 1.5 0 01-1.5-1.5zM6 13h12a6 6 0 01-12 0z"/>',
  medal: '<path fill-rule="evenodd" d="M8 2L11 2 9.8 10.5 6 8.9ZM16 2L13 2 14.2 10.5 18 8.9ZM12 21.5A6.5 6.5 0 1 0 12 8.5A6.5 6.5 0 0 0 12 21.5ZM12 12L15 15 12 18 9 15Z"/>',
  gamepad: '<path fill-rule="evenodd" d="M6 7C3.8 7 2 8.8 2 11v2c0 2.2 1.8 4 4 4 1 0 1.9-.4 2.6-1.1L10.5 14h3l1.9 1.9c.7.7 1.6 1.1 2.6 1.1 2.2 0 4-1.8 4-4v-2c0-2.2-1.8-4-4-4H6zm-.4 3.6h2v2h-2zM14.5 10.8a1 1 0 100 2 1 1 0 000-2zm2 1.8a1 1 0 100 2 1 1 0 000-2z"/>',
  globe: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.9 9h-3.4a15 15 0 00-1.2-5.5A8 8 0 0119.9 11zM12 4.2c.9 1.2 2 3.5 2.4 6.8H9.6C10 7.7 11.1 5.4 12 4.2zM8.7 5.5A15 15 0 007.5 11H4.1a8 8 0 014.6-5.5zM4.1 13h3.4c.1 2 .6 4 1.2 5.5A8 8 0 014.1 13zm5.5 0h4.8c-.4 3.3-1.5 5.6-2.4 6.8-.9-1.2-2-3.5-2.4-6.8zm5.7 5.5c.6-1.5 1.1-3.5 1.2-5.5h3.4a8 8 0 01-4.6 5.5z"/>',
  grad: '<path d="M12 3l11 5-11 5L1 8zm-7 9.2l7 3.2 7-3.2V17l-7 3.5L5 17z"/>',
  chip: '<path d="M9 2h2v3h2V2h2v3h3a1 1 0 011 1v3h3v2h-3v2h3v2h-3v3a1 1 0 01-1 1h-3v3h-2v-3h-2v3H9v-3H6a1 1 0 01-1-1v-3H2v-2h3v-2H2v-2h3V6a1 1 0 011-1h3zM8 8v8h8V8z"/>',
  arrow: '<path d="M4 11h12l-4-4 1.5-1.5L20 12l-6.5 6.5L12 17l4-4H4z"/>',
  menu: '<path d="M3 5h18v2.5H3zm0 5.75h18v2.5H3zM3 16.5h18V19H3z"/>',
  zero: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4c2.8 0 4 2.7 4 6s-1.2 6-4 6-4-2.7-4-6 1.2-6 4-6zm0 2c-1.3 0-2 1.8-2 4s.7 4 2 4 2-1.8 2-4-.7-4-2-4z"/>',
  coin: '<path fill-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm0 2.5a1 1 0 011 1v.6c1.5.3 2.6 1.3 2.6 2.6h-2c0-.5-.6-1-1.6-1s-1.6.4-1.6 1c0 .5.5.8 1.8 1.1 1.9.5 3.3 1.2 3.3 3 0 1.4-1.1 2.4-2.6 2.7v.6a1 1 0 01-2 0v-.6c-1.5-.3-2.6-1.3-2.6-2.7h2c0 .6.6 1.1 1.6 1.1s1.6-.4 1.6-1.1c0-.6-.6-.9-1.9-1.2-1.8-.5-3.2-1.2-3.2-2.9 0-1.4 1.1-2.3 2.6-2.6v-.6a1 1 0 011-1z"/>',
  run: '<path d="M13.49 5.48a2 2 0 100-4 2 2 0 000 4zM9.89 19.38l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>',
  twitch: '<path d="M5 2h16v11.5L17.5 17H14l-3 3H8v-3H4V6zm2 2v10h3v3l3-3h4l2.5-2.5V4zm9.5 3h2v5h-2zm-5 0h2v5h-2z"/>',
  youtube: '<path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4s-3.9 0-6.7.2c-.4.1-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.6c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.3.9 1.7.2 6.5.2 6.5.2s3.9 0 6.7-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5v-1.6c0-1.7-.2-3.5-.2-3.5zM9.8 14.5v-6l5.5 3z"/>'
};
const GZ = {
  cfg: null,
  async config() {
    if (!GZ.cfg) {
      try { const r = await fetch('data/config.json'); GZ.cfg = r.ok ? await r.json() : {}; }
      catch { GZ.cfg = {}; } // e.g. opened via file:// — don't let this throw and block the rest of DOMContentLoaded
    }
    return GZ.cfg;
  },
  todayISO() { return new Date().toISOString().slice(0, 10); },
  fmtDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  icon(name, cls = 'ic') { return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${GZ_ICONS[name] || GZ_ICONS.gamepad}</svg>`; }
};

function injectIcons(root = document) {
  root.querySelectorAll('i[data-ic]').forEach(el => {
    const cls = el.dataset.lg !== undefined ? 'ic ic-lg' : 'ic';
    el.outerHTML = GZ.icon(el.dataset.ic, cls);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load veil: makes the loading moment explicit instead of a blank flash,
  // and on a visitor's very first-ever page load, holds a beat longer and
  // eases open slowly (like a VR headset powering on) rather than a snap-cut.
  (function revealVeil() {
    const veil = document.getElementById('gz-veil');
    if (!veil) return;
    let firstVisit = false;
    try {
      firstVisit = !localStorage.getItem('gz-visited');
      localStorage.setItem('gz-visited', '1');
    } catch { /* storage unavailable (privacy mode, file://) — just use the quick fade */ }
    if (firstVisit) document.body.classList.add('veil-first');
    setTimeout(() => veil.classList.add('veil-hidden'), firstVisit ? 900 : 250);
    veil.addEventListener('transitionend', () => veil.remove(), { once: true });
  })();

  injectIcons();

  const cfg = await GZ.config();
  document.querySelectorAll('[data-cfg]').forEach(el => { const v = cfg[el.dataset.cfg]; if (v) el.textContent = v; });
  // Phone/email displayed via data-cfg get turned into real tel:/mailto:
  // links (not just plain text) when flagged with these attributes.
  document.querySelectorAll('[data-cfg-href-tel]').forEach(el => {
    const v = cfg.phone; if (!v) return;
    const ext = v.match(/ext\.?\s*(\d+)/i);
    const digits = v.split(/ext/i)[0].replace(/\D/g, '');
    el.href = `tel:+1${digits}${ext ? ',' + ext[1] : ''}`;
  });
  document.querySelectorAll('[data-mailto]').forEach(el => { const v = cfg[el.dataset.cfg] || cfg.email; if (v) el.href = `mailto:${v}`; });
  document.querySelectorAll('[data-cfg-href]').forEach(el => {
    const v = cfg[el.dataset.cfgHref];
    if (!v) return;
    el.href = v;
    if (!v.startsWith('mailto:') && !v.startsWith('tel:')) { el.target = '_blank'; el.rel = 'noopener'; }
  });
  const ann = document.getElementById('announcement');
  if (ann && cfg.announcement) ann.textContent = cfg.announcement;

  // Verkada guest check-in/preregister link — the newegg.com/promotions
  // reservation page is retired and no longer used.
  const verkada = cfg.verkadaUrl || cfg.reservationUrl;
  document.querySelectorAll('[data-verkada]').forEach(el => { el.href = verkada; el.target = '_blank'; el.rel = 'noopener'; });
  document.querySelectorAll('[data-verkada-note]').forEach(el => {
    el.textContent = 'Preregister below for a faster check-in.';
  });

  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.main-nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  const decor = document.querySelector('.hero-decor');
  if (decor) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      decor.querySelectorAll('.stripe.s1').forEach(el => el.style.transform = `translateY(${y * .25}px)`);
      decor.querySelectorAll('.stripe.s2').forEach(el => el.style.transform = `translateY(${y * .45}px)`);
      decor.querySelectorAll('.glow').forEach(el => el.style.transform = `translateY(${y * .15}px)`);
    }, { passive: true });
  }

  // About Gamer Zone zone list: every zone shows its image and description
  // up front now — no hover/click toggle needed. Force each <details> open
  // and block toggling it closed either way.
  document.querySelectorAll('.zone-item').forEach(item => {
    item.open = true;
    item.addEventListener('toggle', () => { if (!item.open) item.open = true; });
  });

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt="Full size view">';
  document.body.appendChild(lb);
  lb.addEventListener('click', () => lb.classList.remove('open'));
  document.body.addEventListener('click', e => {
    const img = e.target.closest('.calendar-img, .flyer img');
    if (img) { lb.querySelector('img').src = img.dataset.full || img.src; lb.classList.add('open'); }
  });
});
