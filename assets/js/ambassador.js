/* Ambassador application modal → submits directly to Formspree (AJAX, no
   page navigation) which emails the Gamer Zone team — no mail app required
   on the visitor's end. Falls back to a mailto draft only if the request
   itself fails (e.g. offline). */
document.addEventListener('DOMContentLoaded', async () => {
  const bg = document.getElementById('amb-modal');
  if (!bg) return;
  const cfg = await GZ.config();
  const to = cfg.ambassadorEmail || cfg.contactEmail || 'gamerzone@newegg.com';
  const form = document.getElementById('amb-form');
  const sentNote = document.getElementById('amb-sent');
  const errorNote = document.getElementById('amb-error');

  /* 2026-09-15, per Eric's Ambassador redesign: each of the 3 track cards
     (Collegiate/Influencer/Organization) gets its own real "Apply as X"
     CTA rather than one generic top-of-page button visitors had to guess
     applied to all three. Presetting the modal's own Track <select> here
     (rather than, say, opening three separate forms) means there's still
     exactly one real form and one Formspree endpoint to maintain -- a
     visitor who opens the modal from a track card just lands with that
     track already chosen, and can still change it if they clicked the
     wrong one. The hero/Featured-Ambassador-card CTAs carry no data-track,
     so those still open with the field blank, requiring a conscious pick. */
  // 2026-09-19, design/QA audit fix: real focus management for this real
  // dialog (role="dialog" was already set, but nothing ever moved focus
  // into it, trapped Tab inside it, or returned focus on close). See
  // GZ.dialogFocus in main.js for the shared implementation.
  const focusMgr = GZ.dialogFocus(document.querySelector('#amb-modal .modal'));
  const open = (track) => {
    bg.classList.add('open');
    // Always set the field explicitly (to the preset track, or back to
    // blank) rather than only setting it when a track is given -- without
    // the else branch, opening via a track-specific CTA then closing
    // without submitting and reopening via the generic hero/Featured-
    // Ambassador-card CTA would leave the previous track still selected,
    // silently misrepresenting a visitor's actual choice on this visit.
    if (form.elements['track']) form.elements['track'].value = track || '';
    focusMgr.open();
  };
  const close = () => { bg.classList.remove('open'); focusMgr.close(); };
  document.querySelectorAll('[data-amb-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(b.dataset.track || ''); }));
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.getElementById('amb-close').addEventListener('click', close);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const g = n => (f.elements[n] ? f.elements[n].value : '' || '').trim();
    const recurMonthly = g('recurMonthly');
    f.elements['_subject'].value = recurMonthly === 'Yes'
      ? 'Ambassador Application Program: Recurring Monthly Event'
      : 'Ambassador Application Program';

    sentNote.style.display = 'none';
    errorNote.style.display = 'none';
    const submitBtn = f.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch(f.action, {
        method: 'POST',
        body: new FormData(f),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        sentNote.style.display = 'block';
        f.reset();
      } else {
        throw new Error('Formspree responded with ' + res.status);
      }
    } catch (err) {
      // Fallback: draft a direct email so the application isn't lost.
      const body = [
        'NEWEGG GAMER ZONE: AMBASSADOR APPLICATION',
        '',
        `Name: ${g('name')}`,
        `Email: ${g('email')}`,
        `Ambassador track: ${g('track')}`,
        `Organization / team / school: ${g('org')}`,
        '',
        `Events you can host over the next 6 months: ${g('events')}`,
        `Expected attendees per event: ${g('attendees')}`,
        `Recurs monthly: ${recurMonthly}`,
        `Games / format: ${g('games')}`,
        '',
        'About / why host at the Gamer Zone:',
        g('about'),
        '',
        'Sent from the Gamer Zone Ambassador page (fallback: form submission failed)'
      ].join('\n');
      errorNote.style.display = 'block';
      // 2026-09-19, per Eric ("keep it self descriptive"): the link text
      // itself now describes the destination/action on its own, rather
      // than leaning on "click here" -- a screen reader user tabbing
      // through a page's links out of context (a common navigation
      // pattern) hears "send this as an email instead," not "click here."
      errorNote.innerHTML = `Couldn't submit automatically: <a href="mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent('Ambassador Application Program')}&body=${encodeURIComponent(body)}">send this as an email instead</a>.`;
    } finally {
      submitBtn.disabled = false;
    }
  });
});

/* Diamond "flare" rarity table + picker — not wired to anything live yet.
   The 4 example cards on this page have their data-flare set by hand in
   the HTML. Once the Ambassador event-log backend exists (see
   docs/08-USABILITY-AUDIT-AND-ROADMAP.md, roadmap #1) and can compute who
   has actually reached Diamond, call pickDiamondFlare(stableId) — a
   stable per-ambassador id, e.g. their email or SENET ID — to get a
   deterministic flare name to write into that card's data-flare
   attribute. Deterministic means the same id always rolls the same
   flare (no server-side storage needed just for this), while still
   being effectively random across different ambassadors. Weights sum to
   100; crimson ("Red Diamond") is the rarest at 1% on purpose. */
const DIAMOND_FLARES = [
  { name: 'sapphire', weight: 55 },
  { name: 'aurora',   weight: 24 },
  { name: 'amethyst', weight: 20 },
  { name: 'crimson',  weight: 1 },
];
function pickDiamondFlare(stableId, table = DIAMOND_FLARES) {
  let h = 0;
  for (let i = 0; i < stableId.length; i++) h = (h * 31 + stableId.charCodeAt(i)) >>> 0;
  const roll = (h % 10000) / 100; // deterministic 0.00-99.99 from the id
  let cumulative = 0;
  for (const flare of table) {
    cumulative += flare.weight;
    if (roll < cumulative) return flare.name;
  }
  return table[0].name;
}

/* Featured Ambassadors live search -- matches on name (h3) or pillar tag
   (.host-tag, e.g. "Content Creator", "Organization"). Same approach as
   the Games page search (assets/js/games.js): filtering is just toggling
   each card's [hidden] attribute in place -- no data array, no re-render,
   no fetch/cache layer to build. Reuses the shared .gz-search component
   (style.css) so both search boxes on the site look and behave
   identically.
   2026-09-04, F-04 resolution: the search markup itself was removed from
   ambassador.html (down to a single illustrative "Example" card -- see
   that file's own comment for why), so this IIFE's null guard below now
   makes it a no-op. Left in place rather than deleted so the real search
   UI just needs to be added back to the HTML once roadmap #1's real
   Ambassador roster exists -- no JS rewrite needed. */
(function () {
  const wrap = document.getElementById('host-search-wrap');
  const input = document.getElementById('host-search');
  const clearBtn = document.getElementById('host-search-clear');
  const grid = document.getElementById('host-grid');
  const emptyMsg = document.getElementById('host-search-empty');
  if (!wrap || !input || !grid) return;

  const cards = Array.from(grid.querySelectorAll('.host-card'));
  const cardIndex = cards.map(card => ({
    card,
    text: [
      card.querySelector('h3'),
      card.querySelector('.host-tag'),
    ].filter(Boolean).map(el => el.textContent.toLowerCase()).join(' '),
  }));

  function apply() {
    const q = input.value.trim().toLowerCase();
    wrap.classList.toggle('has-value', q.length > 0);
    let visible = 0;
    cardIndex.forEach(({ card, text }) => {
      const match = !q || text.includes(q);
      card.hidden = !match;
      if (match) visible++;
    });
    if (emptyMsg) emptyMsg.hidden = visible > 0;
  }

  input.addEventListener('input', apply);
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { input.value = ''; apply(); } });
  if (clearBtn) clearBtn.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
})();

/* Expandable Featured Ambassador cards (built 2026-09-10) removed
   2026-09-18 per Eric ("just have the horizontal design, no open
   closing"): .host-card now renders permanently in the side-by-side
   photo/bio layout this IIFE used to toggle via .is-expanded, so there's
   no expand/collapse state left to manage -- see style.css's .host-card
   rule and the HTML comment above #host-grid in ambassador.html for the
   current, always-on layout. */
