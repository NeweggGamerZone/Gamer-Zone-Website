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
  youtube: '<path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4s-3.9 0-6.7.2c-.4.1-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.6c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.3.9 1.7.2 6.5.2 6.5.2s3.9 0 6.7-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5v-1.6c0-1.7-.2-3.5-.2-3.5zM9.8 14.5v-6l5.5 3z"/>',
  mail: '<path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm.8 2L12 12.4 19.2 7H3.8zM4 8.9V17h16V8.9l-7.4 5.1a1 1 0 01-1.2 0L4 8.9z"/>',
  phone: '<path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2a1 1 0 011-.3c1.2.4 2.5.6 3.8.6a1 1 0 011 1V20a1 1 0 01-1 1C10.6 21 3 13.4 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.3.2 2.6.6 3.8a1 1 0 01-.3 1l-2.2 2.2z"/>',
  instagram: '<path fill-rule="evenodd" d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM17.8 5.7a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6z"/>',
  google: '<path fill-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm-.2 3.4c1.6 0 2.8.6 3.7 1.5l-1.5 1.5c-.5-.5-1.3-1-2.2-1-1.9 0-3.4 1.6-3.4 3.6s1.5 3.6 3.4 3.6c1.9 0 2.9-1.2 3.1-2.4h-3.1v-2h5.1c.1.4.1.7.1 1.2 0 3.1-2.1 5.3-5.2 5.3-3.1 0-5.6-2.5-5.6-5.7s2.5-5.6 5.6-5.6z"/>',
  yelp: '<path d="M12 2l2.9 6.3 6.9.8-5.2 4.6 1.5 6.8L12 17l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.8z"/>',
  shield: '<path d="M12 2l8 3v6c0 5.25-3.5 9-8 11-4.5-2-8-5.75-8-11V5l8-3z"/>',
  sword: '<path d="M12 1l2.5 14h-5zM7 15h10v2H7zm4 2h2v5h-2zm-1 5h4v1.5h-4z"/>',
  bow: '<path d="M9 2c-4 4-4 16 0 20-2-4-2-16 0-20z"/><path d="M8.3 2h1.1v20h-1.1z"/><path d="M4.5 11h10l-2.8-2.8 1.4-1.4L18.5 12l-5.4 5.2-1.4-1.4L14.5 13h-10z"/>',
  search: '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 015.9 12.1l4.75 4.75-1.4 1.4-4.75-4.75A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/>',
  close: '<path d="M6.4 5L5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/>',
  // 2026-09-08: added for the shared marquee hover-controls (GZ.marquee's
  // pause/skip overlay, see below) -- no play/pause glyph existed before.
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
};
// 2026-09-08, per Eric ("have their motion synced, so the positions are
// relatively the same, even when pages are closed they are aligned"): a
// single shared time origin for every GZ.marquee instance on the page,
// captured once at script-parse time (i.e. page load), not per-instance.
// See the animation-delay math in marquee() below for how this is used.
const GZ_MARQUEE_EPOCH = performance.now();
const GZ = {
  cfg: null,
  async config() {
    if (!GZ.cfg) {
      try { const r = await fetch('data/config.json'); GZ.cfg = r.ok ? await r.json() : {}; }
      catch { GZ.cfg = {}; } // e.g. opened via file:// — don't let this throw and block the rest of DOMContentLoaded
    }
    return GZ.cfg;
  },
  // Local calendar date (matches the visitor's own device clock), not UTC —
  // toISOString() converts to UTC first, which rolls over to the next (or
  // previous) day early/late depending on the visitor's timezone offset.
  // That was flipping the calendar/weekly-lineup "today" to the wrong day
  // in the evening for anyone west of UTC (all of the US).
  todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  },
  fmtDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  icon(name, cls = 'ic') { return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${GZ_ICONS[name] || GZ_ICONS.gamepad}</svg>`; },
  // Shared infinite-marquee builder (2026-08-26, Pinterest-style "loved by"
  // redesign of the Past Events photo waterfall + Reviews waterfall) — one
  // implementation reused by both, same "gz-shine" philosophy of not
  // writing a bespoke version of an effect that already exists elsewhere.
  // `container` becomes the `.gz-marquee` mask/overflow wrapper; `items` is
  // an array of pre-built HTML strings for each card. Real continuous
  // horizontal motion in a single FIXED-HEIGHT lane is the deliberate
  // choice here: it gives the effect real motion (the old always-visible
  // photo masonry this replaces was retired same-day for having none), but
  // because a marquee lane never grows/shrinks vertically over time the way
  // a variable-length review card in a masonry column would, it can't
  // reintroduce the "whole section visibly grows and shrinks every few
  // seconds" bug that got the reviews section pulled back to a single
  // spotlight card in an earlier redesign (see reviews.js's own history
  // comment for that bug). See .gz-marquee in style.css for the CSS half.
  marquee(container, items, opts = {}) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.classList.add('gz-marquee');
    const track = document.createElement('div');
    track.className = 'gz-marquee-track' + (opts.reverse ? ' rev' : '');
    if (reduceMotion) {
      // No animation at all -- render the single real set once and let it
      // wrap naturally (see .gz-marquee-track under the reduced-motion
      // media query in style.css), rather than showing the duplicated
      // set statically, which would just look like a broken repeat. No
      // hover-controls overlay either -- there's no motion here to
      // pause/skip, and WCAG 2.2.2 doesn't apply to content that never
      // auto-animated in the first place.
      container.classList.add('static');
      track.innerHTML = items.join('');
      container.appendChild(track);
      return;
    }
    // Duplicated once so translateX(-50%) is exactly one full loop of the
    // real content -- the second copy picks up seamlessly where the first
    // left off, no visible seam or jump.
    // 2026-09-04, F-05 fix (scenes-not-specs audit: "content is duplicated
    // in the DOM, screen readers hear everything twice"): the duplicate
    // half is wrapped in a `display:contents` element marked
    // `aria-hidden="true"` -- display:contents keeps every duplicated
    // card as a real flex child of .track (so the layout/gap/animation
    // math is completely unaffected), while aria-hidden removes that
    // whole subtree from the accessibility tree. Sighted users see no
    // difference at all; screen reader users now hear each real review/
    // photo exactly once instead of twice back-to-back. Applies to every
    // GZ.marquee instance site-wide (reviews + both photo waterfalls) in
    // this one shared fix.
    track.innerHTML = items.join('') + `<div aria-hidden="true" style="display:contents">${items.join('')}</div>`;
    container.appendChild(track);
    // 2026-09-04 fix (per Eric: "sometimes at the end, it shows it not
    // looping properly until it crosses the middle point of the screen"):
    // the CSS rule (`animation: gz-marquee-scroll var(--gz-marquee-dur,
    // 46s) linear infinite`) starts playing the INSTANT this element is
    // appended, using the 46s fallback duration -- because --gz-marquee-
    // dur isn't set to the real computed value until the rAF callback
    // below runs a frame later. Changing a custom property referenced by
    // an already-running animation's duration doesn't restart it; the
    // browser just recomputes "how far through the cycle am I" against
    // the new duration, which can visibly jump the very first time it
    // happens -- exactly the "doesn't loop right until partway across"
    // symptom. Fix: hold the animation paused until the real duration is
    // known, then start it -- so it only ever plays at its correct,
    // final-form speed and the loop math is right from frame one.
    track.style.animationPlayState = 'paused';
    // 2026-09-08, F-13 fix: build the shared hover/focus pause+skip
    // control overlay now, while the track is still guaranteed paused --
    // see GZ.buildMarqueeControls below for the full behavior spec. Built
    // once per container, same DOM element for the lifetime of the page,
    // so it survives a Past Events <details> gallery being closed and
    // reopened (that only toggles display:none on an ancestor -- it never
    // removes or rebuilds this node).
    GZ.buildMarqueeControls(container, track);
    // 2026-09-04 fix (per Eric: photos on the hero's expanded 104-photo
    // reel "do not render until they cross the halfway point threshold"):
    // the animation used to start (see the paused->running flip below) as
    // soon as ONE frame had passed, regardless of whether the real <img>
    // files behind it had actually finished downloading yet. On a small
    // gallery that's invisible because a handful of images load near-
    // instantly; on a much bigger real-photo pool, cards toward the back
    // of the track are still mid-download when the track first scrolls
    // into view, so they visibly pop in partway through the loop instead
    // of already being there. Fix: wait for every real <img> in the track
    // to finish loading (or fail) before computing the duration and
    // starting the scroll -- capped at 2.5s so a slow network doesn't
    // hold a gallery frozen indefinitely; whatever hasn't loaded by then
    // just finishes in the background exactly like before.
    const imgs = Array.from(track.querySelectorAll('img'));
    const waits = imgs.map(img => (img.complete && img.naturalWidth > 0)
      ? Promise.resolve()
      : new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); }));
    const timeout = new Promise(resolve => setTimeout(resolve, 2500));
    // Duration is derived from the track's own real measured width (not a
    // fixed guess) so the per-card scroll SPEED stays constant regardless
    // of how many cards are in the pool -- a bigger photo/review pool gets
    // a proportionally longer loop instead of the same loop just playing
    // faster. Measured after images are ready (or the timeout) so layout
    // has actually happened and scrollWidth is trustworthy either way.
    Promise.race([Promise.all(waits), timeout]).then(() => {
      requestAnimationFrame(() => {
        const halfWidth = track.scrollWidth / 2;
        const speed = opts.speed || 40; // px/second
        const dur = Math.max(12, halfWidth / speed);
        track.style.setProperty('--gz-marquee-dur', dur + 's');
        track.dataset.gzDur = dur;
        track.dataset.gzReady = '1';
        // 2026-09-08, per Eric: different galleries load their images (and
        // so start "running") at slightly different real moments -- and
        // any gallery that starts out inside a closed <details> doesn't
        // get to run at all until it's opened, which used to mean it
        // always restarted its loop from 0% the moment it appeared,
        // completely out of step with every other open gallery. Instead
        // of starting at 0%, jump straight to wherever this track WOULD
        // be if it had been continuously running since the one shared
        // GZ_MARQUEE_EPOCH (page load). Every gallery using the same
        // px/second speed then reads as one continuous, synchronized
        // sweep even though each one's own loop length (and thus its own
        // wrap point) differs with its photo count. GZ.resyncMarquee()
        // below re-runs this same math any time a closed gallery reopens
        // (see photo-waterfall.js's archive-month toggle listener) --
        // unless the visitor has it manually paused right now, in which
        // case a reopen shouldn't yank it back into motion out from under
        // them (see the `hardPaused` check inside resyncMarquee).
        GZ.resyncMarquee(track);
      });
    });
  },
  // Re-seeks a marquee track to match the shared GZ_MARQUEE_EPOCH clock and
  // (re)starts it playing -- called once when a track first starts (see
  // above) and again by events.html's archive-month toggle listener every
  // time a closed gallery is reopened, since a display:none element's CSS
  // animation doesn't advance while hidden and would otherwise resume
  // exactly where it was paused, out of sync with galleries that kept
  // running the whole time.
  //
  // 2026-09-08 rewrite (real bug found via direct reproduction, not just
  // reasoning about the CSS): the previous version compensated for the
  // hidden-tracking gap with a relative `animation-delay: -${phase}s`,
  // built on the assumption that a CSS animation's internal timeline
  // resets to zero the moment its element goes display:none. It doesn't --
  // the browser keeps advancing (or at minimum doesn't rewind) that
  // timeline while hidden, so stacking a second negative-delay adjustment
  // on top of a clock that never stopped double-counted the elapsed time.
  // Confirmed with a live Puppeteer repro: closing a Past Events gallery
  // for ~3s and reopening it landed its track at roughly 2x the position
  // of a sibling gallery that had stayed open the whole time -- exactly
  // the "misaligned, acting at different times" symptom Eric flagged.
  // Fix: use the Web Animations API's `Animation.currentTime`, an
  // ABSOLUTE value (ms since the animation's own start), not a relative
  // offset layered on top of whatever the browser did in the background.
  // Setting it directly overrides the internal clock outright instead of
  // trying to out-math it, which is also the same mechanism the new
  // play/pause/skip controls below use -- one shared way of moving this
  // animation around, not two different ones for two different features.
  resyncMarquee(track) {
    const dur = parseFloat(track.dataset.gzDur);
    if (!dur) return;
    const anim = track.getAnimations()[0];
    if (!anim) return;
    const elapsed = (performance.now() - GZ_MARQUEE_EPOCH) / 1000;
    const phase = elapsed % dur;
    anim.currentTime = phase * 1000; // Animation.currentTime is in ms
    anim.playbackRate = 1;
    // A visitor who manually paused this gallery (center play/pause
    // button) shouldn't have it silently resume just because they closed
    // and reopened the accordion it lives in -- re-seek the position so
    // it's still correctly in-step with every other gallery, but leave it
    // paused exactly like they left it.
    if (!track.dataset.gzHardPaused) anim.play();
  },
  // 2026-09-08, F-13 fix (scenes-not-specs audit + Eric's explicit spec):
  // shared hover/focus-triggered pause+skip overlay for every GZ.marquee
  // instance site-wide (Reviews, both Past Events photo waterfalls, the
  // homepage hero photo strip) -- one implementation, reused everywhere,
  // same "gz-shine"/"one shared marquee" philosophy as the rest of this
  // file. Satisfies WCAG 2.2.2 (Pause, Stop, Hide) for real, for every
  // visitor, not just ones with prefers-reduced-motion set: hovering (or
  // keyboard-focusing into) the lane greys it out, stops the motion, and
  // reveals prev/next skip buttons plus a play/pause toggle; leaving it
  // resumes automatic play and hides the controls again -- and a visitor
  // who explicitly hits pause stays paused until they explicitly resume,
  // even across the Past Events accordion being closed and reopened (see
  // the `gzHardPaused` check in resyncMarquee above).
  buildMarqueeControls(container, track) {
    const wrap = document.createElement('div');
    wrap.className = 'gz-marquee-controls';
    wrap.innerHTML = `
      <button type="button" class="gz-mq-btn gz-mq-prev" aria-label="Show previous">${GZ.icon('arrow', 'ic')}</button>
      <button type="button" class="gz-mq-btn gz-mq-playpause" aria-label="Pause">${GZ.icon('pause', 'ic')}</button>
      <button type="button" class="gz-mq-btn gz-mq-next" aria-label="Show next">${GZ.icon('arrow', 'ic')}</button>
    `;
    container.appendChild(wrap);
    const prevBtn = wrap.querySelector('.gz-mq-prev');
    const nextBtn = wrap.querySelector('.gz-mq-next');
    const ppBtn = wrap.querySelector('.gz-mq-playpause');
    prevBtn.querySelector('.ic').style.transform = 'scaleX(-1)';

    function setPlayPauseIcon(isPlaying) {
      ppBtn.innerHTML = GZ.icon(isPlaying ? 'pause' : 'play', 'ic');
      ppBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }

    // Moving one card over: measured from the real gap between the first
    // two real items in the track (not a guessed fixed width), so this
    // works correctly whether it's a 300px review card, a 450px event
    // photo, or a 330px mobile photo -- one shared skip function, no
    // per-instance tuning.
    function stepMs() {
      const dur = parseFloat(track.dataset.gzDur);
      if (!dur) return 0;
      const a = track.children[0], b = track.children[1];
      if (!a || !b) return 0;
      const stepDist = b.getBoundingClientRect().left - a.getBoundingClientRect().left;
      const totalDist = track.scrollWidth / 2;
      if (!totalDist) return 0;
      return (stepDist / totalDist) * dur * 1000;
    }

    // Skips one card smoothly (per Eric: "skip back and skip forward an
    // image smoothly", not an instant cut) by temporarily boosting
    // Animation.playbackRate in the requested direction and polling with
    // requestAnimationFrame until currentTime reaches the target, then
    // snapping exactly to it and resetting the rate. currentTime on an
    // infinitely-looping animation counts up without ever wrapping back
    // to 0 internally (the wrap is purely a visual effect of the
    // keyframes), so target math never needs a modulo or to handle
    // crossing the loop seam as a special case.
    function skip(dir) {
      const anim = track.getAnimations()[0];
      const step = stepMs();
      if (!anim || !step || track.dataset.gzSkipping) return;
      track.dataset.gzSkipping = '1';
      const target = (anim.currentTime || 0) + dir * step;
      const rate = dir * 8;
      anim.playbackRate = rate;
      anim.play();
      function tick() {
        const ct = anim.currentTime || 0;
        const reached = dir > 0 ? ct >= target : ct <= target;
        if (reached) {
          anim.currentTime = target;
          anim.playbackRate = 1;
          // Resume normal playback after the skip completes, unless the
          // visitor has this lane explicitly paused via the play/pause
          // button (hovering alone no longer implies paused -- see enter()
          // below).
          if (track.dataset.gzHardPaused) anim.pause();
          delete track.dataset.gzSkipping;
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    prevBtn.addEventListener('click', () => skip(-1));
    nextBtn.addEventListener('click', () => skip(1));
    ppBtn.addEventListener('click', () => {
      const anim = track.getAnimations()[0];
      if (!anim || !track.dataset.gzDur) return;
      if (anim.playState === 'running') {
        anim.pause();
        track.dataset.gzHardPaused = '1';
        setPlayPauseIcon(false);
      } else {
        anim.playbackRate = 1;
        anim.play();
        delete track.dataset.gzHardPaused;
        setPlayPauseIcon(true);
      }
    });

    // Hover/focus reveals the control scheme -- mouseenter/mouseleave for
    // pointer users, focusin/focusout (which bubble, unlike focus/blur)
    // for keyboard users tabbing onto the skip/play buttons. focusout
    // fires when focus moves between the three buttons too, so it's
    // guarded to only treat it as "left the lane" when focus actually
    // lands outside `container`.
    // 2026-09-08, per Eric (correcting the first version of this): hovering
    // does NOT auto-pause the motion anymore -- it only reveals the
    // overlay/controls, with the real content still scrolling faintly
    // behind it. Motion only stops when the visitor explicitly hits the
    // center play/pause button. This also means the button's icon needs
    // to reflect *actual* animation state on entry, not an assumed
    // just-paused state -- see setPlayPauseIcon(anim.playState==='running')
    // below instead of a hardcoded `false`.
    function enter() {
      track.dataset.gzHovering = '1';
      const anim = track.getAnimations()[0];
      if (anim && track.dataset.gzDur) setPlayPauseIcon(anim.playState === 'running');
    }
    function leave() {
      delete track.dataset.gzHovering;
      // Leaving the lane always resets to the default running state and
      // hides the controls (via the :hover/:focus-within CSS, not JS) --
      // per Eric's spec, a manual pause via the play/pause button is
      // scoped to "while I'm looking at this," not a standing preference
      // that survives the visitor moving on.
      delete track.dataset.gzHardPaused;
      const anim = track.getAnimations()[0];
      if (anim && track.dataset.gzDur) {
        anim.playbackRate = 1;
        anim.play();
        setPlayPauseIcon(true);
      }
    }
    container.addEventListener('mouseenter', enter);
    container.addEventListener('mouseleave', leave);
    container.addEventListener('focusin', enter);
    container.addEventListener('focusout', e => {
      if (!container.contains(e.relatedTarget)) leave();
    });
  },
  // Real open/closed status computed from config.json's hoursSchedule --
  // 2026-08-28, built for the homepage hero redesign (see index.html's
  // .stat-status, formerly .hero-status). Deliberately computed in the VENUE's own timezone
  // (America/Los_Angeles), not the visitor's browser timezone -- a
  // visitor checking the site from another timezone should see whether
  // the Diamond Bar location is actually open right now, not whether it's
  // "10am-7pm" wherever they happen to be. This is the one thing on the
  // homepage that's allowed to say something time-sensitive as fact, so
  // it has to be actually correct, not just plausible -- see CLAUDE.md's
  // "No fabrication of facts": every value here traces back to the same
  // real hoursSchedule the footer's plain-text hours already display, not
  // a second hand-typed guess that could quietly drift out of sync.
  openStatus(cfg) {
    const sched = cfg && cfg.hoursSchedule;
    if (!sched || !Array.isArray(sched.days) || !sched.open || !sched.close) return null;
    const tz = sched.timeZone || 'America/Los_Angeles';
    const now = new Date();
    let parts;
    try {
      parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    } catch { return null; } // unsupported timeZone/Intl in a very old engine -- fail quiet, no status shown
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIdx = dayNames.indexOf(map.weekday);
    const minutesNow = (parseInt(map.hour, 10) % 24) * 60 + parseInt(map.minute, 10);
    const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const openMin = toMin(sched.open), closeMin = toMin(sched.close);
    const fmt12 = mins => {
      const h24 = Math.floor(mins / 60), m = mins % 60;
      const h12 = ((h24 + 11) % 12) + 1;
      return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
    };
    // Returns word/detail as a pair (for the hero stat-row's big-word +
    // small-label layout) alongside the original full-sentence `text`
    // (kept for anything that still wants one string, e.g. an aria-live
    // announcement of the whole thing at once).
    if (dayIdx >= 0 && sched.days.includes(dayIdx) && minutesNow >= openMin && minutesNow < closeMin) {
      return { isOpen: true, word: 'Open', detail: `Closes at ${fmt12(closeMin)}`, text: `Open now · Closes at ${fmt12(closeMin)}` };
    }
    // Find the next day (starting today) that's a real open day, to say
    // exactly when it reopens rather than a vague "closed right now."
    for (let i = 0; i < 8; i++) {
      const d = (dayIdx + i) % 7;
      if (!sched.days.includes(d)) continue;
      const isToday = i === 0 && minutesNow < openMin;
      if (i === 0 && !isToday) continue; // today's open window already passed -- keep looking
      const label = isToday ? 'today' : (i === 1 ? 'tomorrow' : fullDayNames[d]);
      return { isOpen: false, word: 'Closed', detail: `Opens ${label} at ${fmt12(openMin)}`, text: `Closed now · Opens ${label} at ${fmt12(openMin)}` };
    }
    return { isOpen: false, word: 'Closed', detail: '', text: 'Closed now' };
  }
};

// Shared "full text" tooltip (2026-09-04, per Eric: the games page's
// popups shouldn't ever resize the container underneath them). Backs
// every [data-full] trigger site-wide (.game-list li's truncated titles,
// .review-waterfall's clamped review quotes) with ONE tooltip element
// appended directly to <body> -- see .gz-tooltip in style.css for why
// that's the actual fix, not just a tweak: a body-level element
// positioned via getBoundingClientRect() is never a descendant of
// anything it describes, so it can't affect any container's size on any
// browser, structurally, rather than "doesn't seem to in this testing."
// Elements opt in by having both a `data-full` attribute (the full text
// to show) and `tabindex="-1"` (already set by games.js/reviews.js) so
// tap/touch focus reaches it without adding it to the Tab sequence.
GZ.initFullTextTooltips = function initFullTextTooltips(root = document) {
  const els = root.querySelectorAll('[data-full]');
  if (!els.length) return;
  let tip = document.getElementById('gz-shared-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'gz-shared-tooltip';
    tip.className = 'gz-tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }
  function show(el) {
    tip.textContent = el.dataset.full;
    const r = el.getBoundingClientRect();
    tip.style.maxWidth = `${Math.max(220, Math.min(320, r.width))}px`;
    // Render once (off-screen) to measure, then clamp to the viewport so a
    // trigger near the right/bottom edge never pushes the tooltip off-screen.
    tip.style.left = '0px'; tip.style.top = '0px'; tip.classList.add('is-visible');
    const tipRect = tip.getBoundingClientRect();
    let left = r.left, top = r.bottom + 6;
    if (left + tipRect.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - tipRect.width - 8);
    if (top + tipRect.height > window.innerHeight - 8) top = Math.max(8, r.top - tipRect.height - 6);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function hide() { tip.classList.remove('is-visible'); }
  els.forEach(el => {
    if (el.dataset.gzTooltipBound) return;
    el.dataset.gzTooltipBound = '1';
    // 2026-09-08, per Eric ("No hover effect for the what gamers are
    // saying section"): review cards no longer show this tooltip on
    // mouse hover -- only real interactions elsewhere on the site (the
    // Games list's truncated titles) still use it that way. Focus/blur
    // stay wired for every trigger so keyboard/tap users (who have no
    // :hover at all) still reach the full text -- reviews.js's own
    // click-to-focus handler is what gets a mouse/touch user there now.
    if (!el.closest('.review-waterfall')) {
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('mouseleave', hide);
    }
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
  });
};

function injectIcons(root = document) {
  root.querySelectorAll('i[data-ic]').forEach(el => {
    const cls = el.dataset.lg !== undefined ? 'ic ic-lg' : 'ic';
    const wrap = document.createElement('div');
    wrap.innerHTML = GZ.icon(el.dataset.ic, cls);
    const svg = wrap.firstElementChild;
    // Carry over every attribute from the placeholder <i data-ic> element
    // (not just data-ic/data-lg) onto the resulting <svg> — otherwise
    // inline `style` flips (like the zone-stack prev arrow's scaleX(-1))
    // get silently dropped. `class` is skipped since GZ.icon already
    // computed the right one from data-lg.
    for (const attr of el.attributes) {
      if (attr.name === 'class') continue;
      svg.setAttribute(attr.name, attr.value);
    }
    el.replaceWith(svg);
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
  GZ.initFullTextTooltips();

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
  // Live open/closed status for the homepage hero's stat row -- see
  // GZ.openStatus above for why this is computed, not typed. Only touches
  // the elements if they're actually present on this page (currently
  // just index.html's hero). 2026-09-03: split into a word (#hero-status-
  // word, the big stat number's spot) + detail (#hero-status-detail, the
  // small label spot) pair instead of one sentence, to match the stat
  // row's other 3 cards (PCs/reviews/free) -- see .stat-status in
  // style.css. If there's no real hours data, the whole stat card is
  // removed rather than left showing an empty/fabricated value.
  // 2026-09-04 (per Eric, reverted from the "Status Open" + dot treatment):
  // the big value is just the bare word "Open"/"Closed" again, colored via
  // the same is-open/is-closed class (see style.css). The label below it
  // is now a static "Live Status" string in the markup, not the dynamic
  // hours-detail sentence GZ.openStatus() also computes -- that computed
  // .detail string (e.g. "Closes 7:00 PM today") is intentionally unused
  // here now; nothing fabricated, just not displayed in this spot anymore.
  const heroStatusWordEl = document.getElementById('hero-status-word');
  const heroStatusValueEl = document.getElementById('hero-status-value');
  const heroStatusDateEl = document.getElementById('hero-status-date');
  // 2026-09-08, per Eric ("Live Status... will have the current date"): a
  // real MM-DD, from the same local-date logic as GZ.todayISO() (device
  // clock, not UTC -- see that function's own comment for why), computed
  // fresh on every page load so it always reflects today, never a
  // hardcoded value.
  if (heroStatusDateEl) {
    const [, mm, dd] = GZ.todayISO().split('-');
    heroStatusDateEl.textContent = `${mm}-${dd}`;
  }
  if (heroStatusWordEl && heroStatusValueEl) {
    const status = GZ.openStatus(cfg);
    if (status) {
      heroStatusValueEl.textContent = status.word;
      heroStatusWordEl.classList.add(status.isOpen ? 'is-open' : 'is-closed');
    } else {
      const card = heroStatusWordEl.closest('.stat') || heroStatusWordEl;
      card.remove(); // no real hours data to report -- say nothing rather than guess
    }
  }

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

  // Continuous-tabs sliding pill (2026-09-10, per Eric) -- see the
  // .nav-pill comment in style.css for the full reasoning on why this is
  // JS-positioned rather than hand-placed, and why hover/focus "preview"
  // the pill instead of trying to fake a cross-page slide.
  (function initNavPill() {
    const nav = document.querySelector('nav.main-nav');
    const activeLink = nav ? nav.querySelector('a.active') : null;
    if (!nav || !activeLink) return; // e.g. a page with no matching top-nav entry
    const pill = document.createElement('span');
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    nav.prepend(pill);

    function moveTo(link) {
      const navR = nav.getBoundingClientRect();
      const r = link.getBoundingClientRect();
      // Full rect, not just left/width -- the mobile menu stacks links
      // into a column (nav.main-nav flex-direction:column below 720px),
      // so the pill needs to move vertically between rows there, not
      // just slide horizontally the way the desktop single-row nav does.
      pill.style.left = (r.left - navR.left) + 'px';
      pill.style.top = (r.top - navR.top) + 'px';
      pill.style.width = r.width + 'px';
      pill.style.height = r.height + 'px';
    }
    function toActive() { moveTo(activeLink); }

    // Initial placement happens with the settle-in transition suppressed
    // (no left/width to animate FROM yet), then the very next frame turns
    // opacity on -- a pop/settle into place rather than a slide, since a
    // fresh page load has no real "previous tab" position to slide from.
    pill.style.transition = 'none';
    toActive();
    requestAnimationFrame(() => {
      pill.style.transition = '';
      pill.classList.add('settle-in');
    });

    // Hover and keyboard-focus both preview the pill sliding to whatever
    // link is currently under the pointer/focus (focusin/focusout bubble,
    // same reason GZ.buildMarqueeControls uses them over focus/blur), and
    // it slides back to the true active link once the pointer/focus
    // leaves the nav entirely -- not per-link, so moving directly from
    // one link to the next slides pill-to-pill without a snap-back blip
    // in between.
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('mouseenter', () => moveTo(a));
      a.addEventListener('focus', () => moveTo(a));
    });
    nav.addEventListener('mouseleave', toActive);
    nav.addEventListener('focusout', e => {
      if (!nav.contains(e.relatedTarget)) toActive();
    });

    window.addEventListener('resize', toActive);

    // Opening/closing the mobile menu (#nav-toggle, a plain checkbox hack)
    // takes the nav from display:none to a real stacked column or back --
    // its links' rects don't exist until that toggle fires, so reposition
    // right after rather than leaving the pill wherever it last was.
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) navToggle.addEventListener('change', () => requestAnimationFrame(toActive));
  })();

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

  // Homepage tech-tunnel background (.tech-bg/#techno-canvas/.tech-scan) is
  // fixed behind the whole page, not just the hero — left alone it stays at
  // full strength no matter how far you scroll, competing with the sections
  // below. Fade it down (never fully out, so it still reads as the site's
  // theme) once you've scrolled a bit past the hero instead.
  const techLayers = ['.tech-bg', '#techno-canvas', '.tech-scan']
    .map(sel => document.querySelector(sel)).filter(Boolean);
  const heroStage = document.querySelector('.hero-stage');
  if (techLayers.length && heroStage) {
    const MIN_OPACITY = 0.22;
    const applyTechFade = () => {
      const heroBottom = heroStage.offsetTop + heroStage.offsetHeight;
      const fadeStart = Math.max(0, heroBottom - window.innerHeight * 0.35);
      const fadeRange = window.innerHeight * 0.9;
      const progress = Math.min(1, Math.max(0, (window.scrollY - fadeStart) / fadeRange));
      const opacity = 1 - progress * (1 - MIN_OPACITY);
      techLayers.forEach(el => { el.style.opacity = opacity; });
    };
    window.addEventListener('scroll', applyTechFade, { passive: true });
    window.addEventListener('resize', applyTechFade);
    applyTechFade();
  }

  // About Gamer Zone: gamefied trading-card stack (see assets/js/zone-stack.js
  // for the cycling/nav logic) replaced the old always-open accordion above.

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
