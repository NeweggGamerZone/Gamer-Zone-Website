/* Ambassador application modal → composes an email to the Gamer Zone team. */
document.addEventListener('DOMContentLoaded', async () => {
  const bg = document.getElementById('amb-modal');
  if (!bg) return;
  const cfg = await GZ.config();
  const to = cfg.ambassadorEmail || cfg.contactEmail || '';
  const open = () => bg.classList.add('open');
  const close = () => bg.classList.remove('open');
  document.querySelectorAll('[data-amb-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.getElementById('amb-close').addEventListener('click', close);

  document.getElementById('amb-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const g = n => (f.elements[n].value || '').trim();
    const recurMonthly = g('recurMonthly');
    const subject = recurMonthly === 'Yes'
      ? "Ambassador Application Program — Recurring Monthly Event"
      : "Ambassador Application Program";
    const body = [
      'NEWEGG GAMER ZONE — AMBASSADOR APPLICATION',
      '',
      `Name: ${g('name')}`,
      `Email: ${g('email')}`,
      `Phone: ${g('phone')}`,
      `Ambassador type: ${g('type')}`,
      `Organization / team: ${g('org')}`,
      '',
      `Events you can host over 6 months: ${g('events')}`,
      `Expected attendees per event: ${g('attendees')}`,
      `Recurs monthly: ${recurMonthly}`,
      `Games / format: ${g('games')}`,
      '',
      'About / why host at the Gamer Zone:',
      g('about'),
      '',
      '— Sent from the Gamer Zone Ambassador page'
    ].join('\n');
    const mail = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mail;
    document.getElementById('amb-sent').style.display = 'block';
  });
});
