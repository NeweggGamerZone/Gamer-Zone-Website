/* Gamer Zone game library — genre-grouped by default, with filter chips for
   A-Z (flat, alphabetical) or a single genre. Flat data-driven so filtering
   is just re-rendering, no duplicated markup. */
(function () {
  const list = document.getElementById('games-list');
  if (!list) return;
  const chipsWrap = document.getElementById('games-filters');

  const GENRES = [
    { key: 'battle-royale', label: 'Battle Royale', emoji: '🪂' },
    { key: 'shooter', label: 'Shooter', emoji: '🔫' },
    { key: 'moba-strategy', label: 'MOBA & Strategy', emoji: '⚔️' },
    { key: 'fighting', label: 'Fighting', emoji: '🥊' },
    { key: 'party-coop', label: 'Party & Co-op', emoji: '🎉' },
    { key: 'survival-horror', label: 'Survival & Horror', emoji: '💀' },
    { key: 'simulation-sandbox', label: 'Simulation & Sandbox', emoji: '🏗️' },
    { key: 'rpg-adventure', label: 'RPG & Adventure', emoji: '🗡️' },
    { key: 'rhythm-puzzle', label: 'Rhythm & Puzzle', emoji: '🎵' },
    { key: 'racing', label: 'Racing', emoji: '🏁' },
    { key: 'vr', label: 'VR Experiences', emoji: '🥽' },
  ];
  const GENRE_BY_KEY = Object.fromEntries(GENRES.map(g => [g.key, g]));

  const GAMES = [
    ['Fortnite','battle-royale'],['PUBG','battle-royale'],['Fall Guys','battle-royale'],
    ['Super Animal Royale','battle-royale'],['Naraka: Bladepoint','battle-royale'],
    ['Counterstrike 2','shooter'],['Apex Legends','shooter'],['Valorant','shooter'],
    ['Team Fortress 2','shooter'],["Tom Clancy's Rainbow Six Siege",'shooter'],
    ['The Finals','shooter'],['Overwatch','shooter'],['Helldivers 2','shooter'],
    ['Left 4 Dead 2','shooter'],['Deep Rock Galactic','shooter'],['Marvel Rivals','shooter'],
    ['League of Legends','moba-strategy'],['Dota 2','moba-strategy'],
    ['Teamfight Tactics','moba-strategy'],['Legends of Runeterra','moba-strategy'],
    ['StarCraft','moba-strategy'],['StarCraft II','moba-strategy'],
    ['Tekken 7','fighting'],['Tekken 8','fighting'],['Street Fighter 6','fighting'],
    ['Street Fighter Collection 30th Anniversary','fighting'],['Soul Caliber VI','fighting'],
    ['MARVEL vs. CAPCOM Fighting Collection: Arcade Classics','fighting'],
    ['MARVEL Cosmic Invasion','fighting'],['2XKO','fighting'],['Brawlhalla','fighting'],
    ['Among Us','party-coop'],['Stumble Guys','party-coop'],
    ['Overcooked All You Can Eat','party-coop'],['Party Animals','party-coop'],
    ['Golf With Your Friends','party-coop'],['Ultimate Chicken Horse','party-coop'],
    ['Castle Crashers','party-coop'],['Drawful 2','party-coop'],
    ['Jackbox Party Pack 4','party-coop'],['Jackbox Party Pack 6','party-coop'],
    ['Jackbox Party Pack 7','party-coop'],
    ['Dead By Daylight','survival-horror'],['Repo','survival-horror'],['PEAK','survival-horror'],
    ['PC Building Simulator 2','simulation-sandbox'],['PowerWash Simulator 2','simulation-sandbox'],
    ['Stardew Valley','simulation-sandbox'],['Minecraft','simulation-sandbox'],
    ['Roblox','simulation-sandbox'],['Maple Story','simulation-sandbox'],
    ['Guild Wars 2','simulation-sandbox'],['RV There Yet?','simulation-sandbox'],
    ['Where Winds Meet','simulation-sandbox'],['Mecca Chameleon','simulation-sandbox'],
    ['Bloons TD 6','simulation-sandbox'],
    ['Hogwarts Legacy','rpg-adventure'],['Cyberpunk 2077','rpg-adventure'],
    ['Hades 2','rpg-adventure'],['Claire Obscure: Expedition 33','rpg-adventure'],
    ['Metal Gear Solid: Snake Eater','rpg-adventure'],
    ['Beat Saber','rhythm-puzzle'],['Taiko no Tatsujin: Rhythm Festival The Setlist Edition','rhythm-puzzle'],
    ['Geometry Dash','rhythm-puzzle'],
    ['Forza Horizon 6','racing'],['Asseto Corsa','racing'],['Trackmania','racing'],
    ['Arizona Sunshine® VR 2','vr'],['The Thrill of the Fight 2','vr'],
    ['Batman: Arkham Shadow','vr'],['Fruit Ninja','vr'],
    ['Teenage Mutant Ninja Turtles Empire City','vr'],['Population One','vr'],
    ['Kill It With Fire VR','vr'],['Among Us 3D: VR','vr'],
    ['Elder Scrolls V: Skyrim VR','vr'],['VRChat','vr'],['Doctor Who: The Edge of Time','vr'],
  ].map(([name, genre]) => ({ name, genre }));

  function panel(title, emoji, games) {
    const items = games.map(g => `<li><span class="gl-emoji" aria-hidden="true">${emoji}</span>${GZ.esc(g.name)}</li>`).join('');
    return `<section class="reveal in" style="margin-top:1.6rem">
      <h2>${emoji} ${GZ.esc(title)}</h2>
      <div class="game-list-panel" style="margin-top:1rem"><ul class="game-list">${items}</ul></div>
    </section>`;
  }

  function renderByGenre() {
    list.innerHTML = GENRES.map(g => {
      const games = GAMES.filter(x => x.genre === g.key);
      return games.length ? panel(g.label, g.emoji, games) : '';
    }).join('');
  }

  function renderAZ() {
    const sorted = GAMES.slice().sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML = panel('A–Z', '🔤', sorted);
  }

  function renderGenre(key) {
    const g = GENRE_BY_KEY[key];
    const games = GAMES.filter(x => x.genre === key);
    list.innerHTML = panel(g.label, g.emoji, games);
  }

  function setActive(btn) {
    chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  }

  chipsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    setActive(btn);
    const mode = btn.dataset.mode;
    if (mode === 'genre') renderByGenre();
    else if (mode === 'az') renderAZ();
    else renderGenre(btn.dataset.genre);
  });

  renderByGenre();
})();
