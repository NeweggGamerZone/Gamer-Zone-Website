/* Tiny, generic photo carousel: any .photo-carousel wrapper with
   .carousel-img children gets prev/next arrows and a "n / total" counter.
   No dependencies, no build step. Stacked-peek presentation: the active
   image is shown full-size, and the images immediately before/after it
   in the sequence stay mounted (tagged .prev/.next) so CSS can push them
   behind the active card, dimmed and peeking out at each edge — clicking
   a peeking image jumps straight to it. */
(function () {
  document.querySelectorAll('.photo-carousel').forEach(function (car) {
    const imgs = Array.from(car.querySelectorAll('.carousel-img'));
    if (!imgs.length) return;
    const prevBtn = car.querySelector('.carousel-arrow.prev');
    const nextBtn = car.querySelector('.carousel-arrow.next');
    const countEl = car.querySelector('.carousel-count-current');
    let i = 0;
    function show(idx) {
      i = (idx + imgs.length) % imgs.length;
      const prevIdx = (i - 1 + imgs.length) % imgs.length;
      const nextIdx = (i + 1) % imgs.length;
      imgs.forEach((img, n) => {
        img.classList.toggle('active', n === i);
        // Single-image carousels: don't tag the same image as both prev
        // and next (and never tag the active image as either).
        img.classList.toggle('prev', n === prevIdx && n !== i);
        img.classList.toggle('next', n === nextIdx && n !== i && n !== prevIdx);
      });
      if (countEl) countEl.textContent = i + 1;
    }
    if (prevBtn) prevBtn.addEventListener('click', () => show(i - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => show(i + 1));
    // Tap/click a peeking side image to jump straight to it.
    imgs.forEach((img, n) => {
      img.addEventListener('click', () => {
        if (img.classList.contains('prev')) show(i - 1);
        else if (img.classList.contains('next')) show(i + 1);
      });
    });
    // swipe support on mobile
    let touchX = null;
    car.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
    show(0);
  });
})();
