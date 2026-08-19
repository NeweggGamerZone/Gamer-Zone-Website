/* About Gamer Zone "trading card" stack — cycles through the zone cards one
   at a time (front card + two peeking behind it, like a hand of cards),
   auto-advancing every 60s, with prev/next buttons and dot nav for anyone
   who wants to browse manually. Manual interaction resets the 60s timer so
   it doesn't immediately auto-advance right after someone clicks. */
(function () {
  const stack = document.getElementById('zone-stack');
  if (!stack) return;
  const cards = Array.from(stack.querySelectorAll('.zone-card'));
  const dotsWrap = document.getElementById('zone-dots');
  const prevBtn = document.getElementById('zone-prev');
  const nextBtn = document.getElementById('zone-next');
  const N = cards.length;
  if (!N) return;

  let current = 0;
  let timer = null;
  const AUTOCYCLE_MS = 60000;

  if (dotsWrap) {
    dotsWrap.innerHTML = cards.map((_, i) => `<button type="button" class="zone-stack-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Show zone ${i + 1}"></button>`).join('');
  }

  function render() {
    cards.forEach((card, i) => {
      const offset = (i - current + N) % N;
      card.dataset.pos = offset <= 2 ? String(offset) : 'hidden';
    });
    if (dotsWrap) {
      dotsWrap.querySelectorAll('.zone-stack-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }
  }

  function goTo(i, restart = true) {
    current = ((i % N) + N) % N;
    render();
    if (restart) resetTimer();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function resetTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => goTo(current + 1, false), AUTOCYCLE_MS);
  }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (dotsWrap) {
    dotsWrap.addEventListener('click', e => {
      const btn = e.target.closest('.zone-stack-dot');
      if (!btn) return;
      goTo(Number(btn.dataset.i));
    });
  }
  // Clicking a peeking (non-front) card brings it to the front too.
  stack.addEventListener('click', e => {
    const card = e.target.closest('.zone-card');
    if (!card || card.dataset.pos === '0') return;
    goTo(cards.indexOf(card));
  });

  render();
  resetTimer();
})();
