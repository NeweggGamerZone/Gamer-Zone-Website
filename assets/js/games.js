/* Gamer Zone game library — organized by physical device/station (PC,
   Consoles, VR, Racing Simulators, Arcade), with an A-Z view and a second
   set of genre tags (Co-op, Single Player, Competitive) that filter across
   every device. Flat data-driven so filtering is just re-rendering, no
   duplicated markup, no emoji — flat SVG icons from the shared icon set and
   plain bulleted lists. Every list is automatically alphabetized. */
(function () {
  const list = document.getElementById('games-list');
  if (!list) return;
  const chipsWrap = document.getElementById('games-filters');
  const genreWrap = document.getElementById('games-genre-filters');

  // 2026-09-18, per Eric: "Arcade" renamed to "Arcade Station" in every
  // visitor-facing label (this chip, the games-cat-grid card in games.html,
  // and the panel heading, which is generated from this same `label`).
  // The internal `key: 'arcade'` is unchanged so filtering/data-platform
  // attributes/URLs keep working.
  const PLATFORMS = [
    { key: 'pc', label: 'PC', icon: 'pc' },
    { key: 'console', label: 'Consoles', icon: 'gamepad' },
    { key: 'vr', label: 'VR', icon: 'vr' },
    { key: 'racing-sim', label: 'Racing Simulators', icon: 'wheel' },
    { key: 'arcade', label: 'Arcade Station', icon: 'coin' },
  ];
  const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));

  const GENRES = [
    { key: 'coop', label: 'Co-op' },
    { key: 'single', label: 'Single Player' },
    { key: 'competitive', label: 'Competitive' },
  ];
  const GENRE_BY_KEY = Object.fromEntries(GENRES.map(g => [g.key, g]));

  // Physical systems/notes shown alongside a platform's game list.
  const PLATFORM_NOTE = {
    pc: '26 gaming PCs available.',
    console: 'Systems: Xbox &middot; Nintendo Switch 2 &middot; PlayStation 5 &middot; Retro Games Emulator',
  };

  // VR sub-label — which headset/storefront each title runs on. Rebuilt
  // 2026-09-18 per Eric's real supplied inventory (Steam VR list + Meta
  // Quest list); every VR title now gets a label rather than only some.
  // Population One is the one title on both lists -- entered once in
  // GAMES below, labeled here as available on both rather than duplicated
  // as two list rows.
  const VR_SYSTEM = {
    'Kill It With Fire VR': 'Steam VR',
    'Among Us 3D: VR': 'Steam VR',
    'Beat Saber': 'Steam VR',
    'The Elder Scrolls V: Skyrim VR': 'Steam VR',
    'VRChat': 'Steam VR',
    'Doctor Who: The Edge of Time': 'Steam VR',
    'Arizona Sunshine VR 2': 'Meta Quest only',
    'The Thrill of the Fight 2': 'Meta Quest only',
    'Batman: Arkham Shadow': 'Meta Quest only',
    'Fruit Ninja': 'Meta Quest only',
    'Teenage Mutant Ninja Turtles Empire City': 'Meta Quest only',
    'Population One': 'Steam VR & Meta Quest',
  };

  // Generic secondary note shown under a game's title, same visual
  // treatment as the VR sub-label above (dim, smaller, in parens) but not
  // tied to VR platform info. Added 2026-09-18, per Eric, so "Street
  // Fighter DLC (1-4)" is no longer a separate list entry -- it's now a
  // note attached directly to Street Fighter 6 itself. Reusable for any
  // future game that needs a similar secondary callout instead of
  // hardcoding a one-off into the HTML.
  const GAME_NOTE = {
    'Street Fighter 6': 'DLC Years 1–4 Available',
  };

  // [name, platform, genre?]
  const GAMES = [
    // PC — every launcher on the gaming PCs (Epic, Steam, Riot, Roblox, Battle.net, Microsoft Store).
    ['Fortnite', 'pc', 'competitive'], ['Rocket League', 'pc', 'competitive'], ['Fall Guys', 'pc', 'competitive'],
    ['PC Building Simulator 2', 'pc', 'single'], ['Hogwarts Legacy', 'pc', 'single'],
    ['Dota 2', 'pc', 'competitive'], ['Marvel Rivals', 'pc', 'competitive'], ['Naraka: Bladepoint', 'pc', 'competitive'],
    ['Aimlabs', 'pc'], ['Brawlhalla', 'pc', 'competitive'], ['Where Winds Meet', 'pc', 'single'],
    ['Team Fortress 2', 'pc', 'competitive'], ['Counter-Strike 2', 'pc', 'competitive'], ['Stumble Guys', 'pc', 'competitive'],
    ['Super Animal Royale', 'pc', 'competitive'], ['Helldivers 2', 'pc', 'coop'], ['REPO', 'pc', 'coop'],
    ['Among Us', 'pc', 'coop'], ['Clair Obscur: Expedition 33', 'pc', 'single'],
    ['Metal Gear Solid: Snake Eater', 'pc', 'single'], ['Hades 2', 'pc', 'single'],
    ['Deep Rock Galactic', 'pc', 'coop'], ['Arc Raiders', 'pc', 'competitive'],
    ['Overcooked! All You Can Eat', 'pc', 'coop'], ['Stardew Valley', 'pc', 'single'],
    ['The Finals', 'pc', 'competitive'], ['MapleStory', 'pc'], ['Apex Legends', 'pc', 'competitive'],
    ['Trackmania', 'pc', 'competitive'], ["Tom Clancy's Rainbow Six Siege", 'pc', 'competitive'],
    ['Mecha Chameleon', 'pc'], ['Dead by Daylight', 'pc', 'competitive'], ['Cyberpunk 2077', 'pc', 'single'],
    ['PUBG', 'pc', 'competitive'], ['Geometry Dash', 'pc', 'single'],
    ['League of Legends', 'pc', 'competitive'], ['VALORANT', 'pc', 'competitive'], ['Teamfight Tactics', 'pc', 'competitive'],
    ['Legends of Runeterra', 'pc', 'competitive'],
    ['Roblox', 'pc'],
    ['Call of Duty: Warzone', 'pc', 'competitive'], ['Overwatch', 'pc', 'competitive'],
    // Added 2026-09-04, per Eric.
    ['Black Myth: Wukong', 'pc', 'single'], ['Asphalt Legends Unite', 'pc', 'competitive'],
    ['Onimusha: Way of the Sword', 'pc', 'single'], ['Stray', 'pc', 'single'],
    ['007 First Light', 'pc', 'single'], ['Crimson Desert', 'pc', 'single'],
    // Party titles — played on the PCs, tagged Co-op.
    // 2026-09-18, per Eric: Jackbox Party Pack 4/6/7 removed from this PC
    // list -- 4 and 6 are still available in Arcade Station below; 7
    // wasn't previously in Arcade Station at all, so per Eric's own call
    // it moved there too (see Arcade Station's own comment) rather than
    // disappearing from the library entirely. Drawful 2 is unaffected.
    ['Taiko no Tatsujin: Rhythm Festival', 'pc', 'coop'],
    ['Drawful 2', 'pc', 'coop'],
    ['Castle Crashers', 'pc', 'coop'],
    // Added 2026-09-17, per Eric.
    ['WARDOGS', 'pc'], ['Minecraft', 'pc'],

    // Consoles — Nintendo Switch station.
    // 2026-09-18, per Eric: the old generic "Mario Kart" entry is now
    // "Mario Kart 8" (renamed in place, not a new/duplicate row), plus two
    // real Switch titles added -- Super Mario Wonder and Splatoon Raiders.
    ['Super Smash Bros.', 'console', 'competitive'], ['Mario Party', 'console', 'coop'],
    ['Super Mario 3D World', 'console', 'coop'], ['Mario Kart 8', 'console', 'competitive'],
    ['Super Mario Wonder', 'console', 'coop'], ['Splatoon Raiders', 'console', 'competitive'],
    ['NBA2K26', 'console', 'competitive'], ['FC26', 'console', 'competitive'],
    ['Star Fox', 'console', 'single'], ['Xbox Game Pass Basic', 'console'],

    // VR headsets. Rebuilt 2026-09-18 per Eric's real supplied inventory --
    // see VR_SYSTEM above for the per-title Steam VR / Meta Quest / both
    // labels. The old 3-title list (including Dumb Ways to Die VR, not
    // part of the new inventory) is fully replaced, not merged.
    ['Kill It With Fire VR', 'vr'], ['Among Us 3D: VR', 'vr'], ['Population One', 'vr'],
    ['Beat Saber', 'vr'], ['The Elder Scrolls V: Skyrim VR', 'vr'], ['VRChat', 'vr'],
    ['Doctor Who: The Edge of Time', 'vr'],
    ['Arizona Sunshine VR 2', 'vr'], ['The Thrill of the Fight 2', 'vr'],
    ['Batman: Arkham Shadow', 'vr'], ['Fruit Ninja', 'vr'],
    ['Teenage Mutant Ninja Turtles Empire City', 'vr'],

    // Racing Simulator rigs.
    ['Forza Horizon 6', 'racing-sim'], ['Assetto Corsa', 'racing-sim'],

    // Arcade Station — was fighting games only until 2026-09-17; per Eric,
    // now also covers a few real co-op/party arcade titles (see below)
    // alongside the existing fighting-game core.
    ['2XKO', 'arcade', 'competitive'],
    // 2026-09-18, per Eric: "Street Fighter DLC (1-4)" is no longer its
    // own list entry -- see GAME_NOTE above, which attaches "DLC Years
    // 1-4 Available" directly to Street Fighter 6's own row instead.
    ['Street Fighter 6', 'arcade', 'competitive'],
    ['Street Fighter Collection 30th Anniversary', 'arcade', 'competitive'],
    ['MARVEL vs. CAPCOM Fighting Collection: Arcade Classics', 'arcade', 'competitive'],
    ['MARVEL Cosmic Invasion', 'arcade', 'competitive'], ['Tekken 7', 'arcade', 'competitive'],
    ['Tekken 8', 'arcade', 'competitive'], ['SoulCalibur VI', 'arcade', 'competitive'],
    ['Marvel Tokon: Fighting Souls', 'arcade', 'competitive'],
    ['Avatar Legends: The Fighting Game', 'arcade', 'competitive'],
    ['Dragon Ball FighterZ', 'arcade', 'competitive'],
    // Added 2026-09-17, per Eric. Teenage Mutant Ninja Turtles: Shredder's
    // Revenge is a co-op beat-'em-up, not a 1v1 fighter, tagged 'coop' to
    // match its real genre rather than lumping it in with 'competitive'
    // just because it's in the Arcade Station list. Jackbox Party Pack 4
    // and 6 are also already in the PC list above (played there as party
    // games during general PC sessions) -- this adds them to Arcade
    // Station too, since that's genuinely a second, separate place they
    // get played, not a move/duplicate-cleanup request.
    ["Teenage Mutant Ninja Turtles: Shredder's Revenge", 'arcade', 'coop'],
    ['Jackbox Party Pack 4', 'arcade', 'coop'], ['Jackbox Party Pack 5', 'arcade', 'coop'],
    ['Jackbox Party Pack 6', 'arcade', 'coop'],
    // 2026-09-18, per Eric: Jackbox Party Pack 7 moved here from the PC
    // list (see that list's own comment) rather than being removed from
    // the library outright, so it stays available in Arcade Station.
    ['Jackbox Party Pack 7', 'arcade', 'coop'],
  ].map(([name, platform, genre]) => ({ name, platform, genre: genre || null }));

  function byName(a, b) { return a.name.localeCompare(b.name); }

  function itemLine(g) {
    const vrLabel = g.platform === 'vr' && VR_SYSTEM[g.name] ? VR_SYSTEM[g.name] : '';
    const noteLabel = !vrLabel && GAME_NOTE[g.name] ? GAME_NOTE[g.name] : '';
    const subText = vrLabel || noteLabel ? ` (${vrLabel || noteLabel})` : '';
    const sub = subText ? ` <span class="dim" style="font-size:.82em">${GZ.esc(subText)}</span>` : '';
    // Full name (+ VR system, if any) wraps up to 2 lines inside .gl-name as
    // one flowing text block (see .game-list li .gl-name in style.css) --
    // every row reserves the same height regardless of title length, so
    // nothing looks lopsided next to a short title. data-full still backs a
    // pure-CSS hover/tap popup as a fallback for the rare title that's still
    // too long even at 2 lines.
    // tabindex="-1" makes the row focusable on tap/click (so the popup also
    // works on touch devices, which have no :hover) without adding it to the
    // Tab key sequence -- keyboard users tabbing through the page don't have
    // to step through every single game name to get past this list.
    return `<li tabindex="-1" data-full="${GZ.esc(g.name + subText)}"><span class="gl-name">${GZ.esc(g.name)}${sub}</span></li>`;
  }

  function panel(title, iconName, games, note) {
    const items = games.slice().sort(byName).map(itemLine).join('');
    const icon = iconName ? GZ.icon(iconName, 'ic') : '';
    return `<section class="reveal in" style="margin-top:1.6rem">
      <h2>${icon} ${GZ.esc(title)}</h2>
      ${note ? `<p class="dim console-systems">${note}</p>` : ''}
      <div class="game-list-panel" style="margin-top:1rem"><ul class="game-list">${items}</ul></div>
    </section>`;
  }

  // Every render*() function below fully replaces #games-list's innerHTML,
  // which means any [data-full] tooltip listeners bound to the previous
  // set of <li> elements are gone along with them (new DOM nodes, not the
  // same elements). GZ.initFullTextTooltips(list) re-binds the shared
  // body-level tooltip (see main.js) to whatever's on screen now -- it
  // no-ops on elements it's already bound (dataset.gzTooltipBound guard),
  // so this is just "make sure everything current is covered," not a
  // wasteful full rebind.
  function renderByPlatform() {
    list.innerHTML = PLATFORMS.map(p => {
      const games = GAMES.filter(x => x.platform === p.key);
      return games.length ? panel(p.label, p.icon, games, PLATFORM_NOTE[p.key]) : '';
    }).join('');
    GZ.initFullTextTooltips(list);
  }

  function renderAZ() {
    list.innerHTML = panel('A-Z', null, GAMES);
    GZ.initFullTextTooltips(list);
  }

  function renderPlatform(key) {
    const p = PLATFORM_BY_KEY[key];
    const games = GAMES.filter(x => x.platform === key);
    list.innerHTML = panel(p.label, p.icon, games, PLATFORM_NOTE[key]);
    GZ.initFullTextTooltips(list);
  }

  function renderGenre(key) {
    const g = GENRE_BY_KEY[key];
    const games = GAMES.filter(x => x.genre === key);
    list.innerHTML = panel(g.label, null, games);
    GZ.initFullTextTooltips(list);
  }

  // ---- Live search --------------------------------------------------
  // GAMES is a small, already-in-memory array (well under 100 rows) built
  // once at load, so a full Array.filter on every keystroke costs a
  // fraction of a millisecond — there's no separate cache/index to build
  // or debounce to add for this to stay fast; the "don't slow the site
  // down" requirement is satisfied by the data being this small and
  // static, not by extra machinery on top of it.
  let activeRenderFn = renderByPlatform; // whichever chip view search should fall back to once cleared
  function renderSearch(query) {
    const q = query.trim().toLowerCase();
    const matches = GAMES.filter(g => g.name.toLowerCase().includes(q));
    if (!matches.length) {
      list.innerHTML = `<p class="gz-search-empty">No games matched &ldquo;${GZ.esc(query.trim())}&rdquo;. Try a shorter search, or see the note below to let us know what's missing.</p>`;
      return;
    }
    list.innerHTML = panel(`Search results for “${query.trim()}”`, 'search', matches);
    GZ.initFullTextTooltips(list);
  }

  function clearSearch({ refocus = false } = {}) {
    searchInput.value = '';
    searchWrap.classList.remove('has-value');
    activeRenderFn();
    if (refocus) searchInput.focus();
  }

  const searchWrap = document.getElementById('games-search-wrap');
  const searchInput = document.getElementById('games-search');
  const searchClear = document.getElementById('games-search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value;
      searchWrap.classList.toggle('has-value', q.trim().length > 0);
      if (q.trim()) renderSearch(q); else activeRenderFn();
    });
    // Esc clears the box (a native <input type="search"> already does
    // this for the typed text in most browsers; this also resets our own
    // rendered view to match, and Enter is harmless since there's no form
    // submit to prevent).
    searchInput.addEventListener('keydown', e => { if (e.key === 'Escape' && searchInput.value) clearSearch(); });
  }
  if (searchClear) searchClear.addEventListener('click', () => clearSearch({ refocus: true }));

  function setActive(wrap, btn) {
    wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  }

  // Picking a chip always wins over an in-progress search (rather than
  // silently ignoring one or the other) -- clears the search box back to
  // its empty state so there's only ever one filter in effect at a time.
  chipsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    setActive(chipsWrap, btn);
    if (genreWrap) genreWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const mode = btn.dataset.mode;
    if (mode === 'platform') activeRenderFn = renderByPlatform;
    else if (mode === 'az') activeRenderFn = renderAZ;
    else activeRenderFn = () => renderPlatform(btn.dataset.platform);
    if (searchInput && searchInput.value) { searchInput.value = ''; searchWrap.classList.remove('has-value'); }
    activeRenderFn();
  });

  if (genreWrap) {
    genreWrap.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      setActive(genreWrap, btn);
      chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      activeRenderFn = () => renderGenre(btn.dataset.genre);
      if (searchInput && searchInput.value) { searchInput.value = ''; searchWrap.classList.remove('has-value'); }
      activeRenderFn();
    });
  }

  // Tapping/clicking a truncated title should reveal the full name via the
  // shared tooltip's focus listener (GZ.initFullTextTooltips in main.js) --
  // but tabindex="-1" elements don't reliably receive focus from a plain click
  // in every browser, so call .focus() explicitly. Delegated on the stable
  // #games-list container (survives the innerHTML re-renders above) rather
  // than attached per-row.
  list.addEventListener('click', e => {
    const li = e.target.closest('.game-list li[data-full]');
    if (li) li.focus();
  });

  // Games page category cards (2026-09-15, per Eric) -- real <button>s in
  // #games-cat-grid (games.html), styled like .zone-card photo cards. Each
  // just clicks the matching chip in #games-filters -- reusing that click
  // handler's own filter/render/active-state logic wholesale instead of a
  // second, parallel way to select a platform -- then scrolls the filter
  // row + list into view so the result of the click is actually visible.
  const catGrid = document.getElementById('games-cat-grid');
  if (catGrid) {
    catGrid.addEventListener('click', e => {
      const btn = e.target.closest('.game-cat-card');
      if (!btn) return;
      const chip = chipsWrap.querySelector(`.chip[data-platform="${btn.dataset.platform}"]`);
      if (!chip) return;
      chip.click();
      chipsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  renderByPlatform();
})();
