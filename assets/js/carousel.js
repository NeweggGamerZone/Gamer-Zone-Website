/* Tiny, generic photo carousel: any .photo-carousel wrapper with
   .carousel-img children gets prev/next arrows and a "n / total" counter.
   No dependencies, no build step — just toggles which image is visible. */
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
      imgs.forEach((img, n) => img.classList.toggle('active', n === i));
      if (countEl) countEl.textContent = i + 1;
    }
    if (prevBtn) prevBtn.addEventListener('click', () => show(i - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => show(i + 1));
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
