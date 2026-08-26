/* Ambassador application modal → submits directly to Formspree (AJAX, no
   page navigation) which emails the Gamer Zone team — no mail app required
   on the visitor's end. Falls back to a mailto draft only if the request
   itself fails (e.g. offline). */
document.addEventListener('DOMContentLoaded', async () => {
  const bg = document.getElementById('amb-modal');
  if (!bg) return;
  const cfg = await GZ.config();
  const to = cfg.ambassadorEmail || cfg.contactEmail || 'gamerzone@newegg.com';
  const open = () => bg.classList.add('open');
  const close = () => bg.classList.remove('open');
  document.querySelectorAll('[data-amb-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.getElementById('amb-close').addEventListener('click', close);

  const form = document.getElementById('amb-form');
  const sentNote = document.getElementById('amb-sent');
  const errorNote = document.getElementById('amb-error');

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
        `Organization / team: ${g('org')}`,
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
      errorNote.innerHTML = `Couldn't submit automatically. <a href="mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent('Ambassador Application Program')}&body=${encodeURIComponent(body)}">click here to send it as an email instead</a>.`;
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
