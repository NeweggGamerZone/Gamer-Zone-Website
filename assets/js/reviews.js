/* Rotating reviews spotlight.
   Previously this section rendered all 63 written Google reviews as a
   static grid (plus a line naming the 23 reviewers who rated 5 stars with
   no written text) -- every card stretched to match the tallest card in
   its row, which produced huge blank space under short reviews, and the
   named-reviewers line read as an odd wall of names. A later "waterfall"
   version showed 4 cards at once, each on its own staggered timer, cycling
   through the full pool -- but with review lengths ranging from a 3-word
   quip to a 400+ word paragraph, whichever slot happened to swap in a much
   longer or shorter review made the whole grid row (and the section under
   it) visibly grow or shrink every few seconds, and a shared 7s timer for
   every slot meant a long review got yanked away long before it could be
   read. Per request: show exactly one review at a time, in a box
   pre-sized to fit the single longest review in the pool (measured once,
   off-screen, against the real card markup/width) so the section's height
   never moves no matter which review is showing, and give each review a
   dwell time proportional to its own length instead of one fixed interval
   for all of them.

   The review pool is baked in directly below rather than fetched from a
   data/*.json file: unlike events.json (edited often, shared across
   multiple pages, needs an offline-browsing fallback), this list is
   static site copy that only this one section uses, so a fetch would
   just add a network round-trip and a flash-of-empty-cards while it
   resolves, for no real benefit. */
(function () {
  const wrap = document.getElementById('review-waterfall');
  if (!wrap) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // All 63 written Google reviews (5 stars each) as of the last sync with
  // Google's listing. The aggregate stat line ("5.0 rating · 86 Google
  // reviews") includes these plus 23 more reviewers who rated 5 stars with
  // no written text -- no longer listed by name on-page, but still counted
  // in that total.
  const REVIEWS = [
    { q: "Awesome space and such a cool community here!", n: "Sirena M." },
    { q: "Had a lot of fun experiencing the very best of gaming with the Gamer Zone’s desktop pcs. Internet cafes aren't super big in America so it’s really cool to have this spot for people to try out gaming at its best picture and performance for free.", n: "Samantha A." },
    { q: "Really amazing zone with the best gaming computers that run super smooth!", n: "Josue G." },
    { q: "Attending the Newegg Gamer Zone events was an exciting and memorable experience. The atmosphere was full of energy, and it was great to be surrounded by people who share a passion for gaming and technology. I enjoyed checking out the different gaming setups, hardware, accessories, and activities available throughout the event. The interactive demonstrations made everything more interesting because I could see the technology being used instead of just reading about it. I also enjoyed watching gamers compete and seeing the excitement from the crowd. Overall, the event was fun, informative, and welcoming. I would definitely recommend the Newegg Gamer Zone events to anyone who enjoys gaming, computers, and new technology.", n: "Adam S." },
    { q: "Great place. Playing the game and making connections here was great.", n: "Darvion M." },
    { q: "Awesome place to test out high-end PCs and gear before buying! The setup at their Diamond Bar showroom lets you try prebuilt gaming rigs, mechanical keyboards, mice, and even VR/racing setups for free. Super friendly staff, open to the public, and a great spot for local gamers. Definitely worth dropping by if you're trying to play some games!", n: "Aaron C." },
    { q: "Great space and really cool atmosphere. I even got to meet n0thing.", n: "Roby H." },
    { q: "Excellent place to go hang out and chill they have snacks and a really cool environment", n: "7 3" },
    { q: "Very fun place to visit they treat you right", n: "Aden P." },
    { q: "Great place for my kids. Clean stations, and the staff is very courteous and helpful. An added benefit for newcomers like us!", n: "Jin" },
    { q: "Very cool place! The staff was very friendly and helpful. I came with my wife and kids and we played a handful of games with each other. Would definitely come again!", n: "Perdana A." },
    { q: "nice places, some times the mouse will disconnected from the pc if you are using wireless mouse. Besides that every thing is cool and it’s completely free", n: "Shun Y." },
    { q: "Very good place for computer game lovers. Wonderful !! It will make you young again.", n: "Jason Y." },
    { q: "An amazing place to adults and kids alike. A must visit.", n: "Sal H." },
    { q: "Neat place with a lot of nice setups. Surprised more people haven't been talking about it considering it's completely free and a fun place to be", n: "Satoshi Y." },
    { q: "was here for a video game tournament, clean builiding, the room just gives off such a nice vibe like a sudden jump from office building to a full blown arcade.", n: "Shingo A." },
    { q: "Dope place to game and make friends who also enjoy gaming!", n: "Andrew P." },
    { q: "Awesome place to play games!", n: "Shannon S." },
    { q: "This Lan center is honestly the best.", n: "Angel C." },
    { q: "Came here for Street fighter review and the whole experience is amazing. The gaming setup is immaculate and the prizes offered for the rifle, it's amazing!", n: "Omar M." },
    { q: "Clean and nice setups they have at the corporate building. Staff and organizers are great. Support and assistance are A+!", n: "Alexander N." },
    { q: "Nice place. Chill/clean atmosphere, friendly staff, and free PC games!", n: "Dylan N." },
    { q: "This place is amazing! The ambience of the room is great and it’s every gamers dream. They have all games you can think of and if they don’t you can always give recommendations to the front desk staff. The staff is so friendly and really try to make that connection with each gamer. The best part of this place? It’s FREE.", n: "Sean X." },
    { q: "This is good place to play games & hang out with friend for a fun day. Staffs are friendly. I would definitely be back soon.", n: "Allen W." },
    { q: "Very nice atmosphere, got good selection of games, and free snacks :)", n: "Mark J." },
    { q: "The environment is very kid friendly. Everyone is just chilling and playing game. There’s 4 tv showing anime at all time.", n: "Dat T." },
    { q: "This place is a vibe!!! Over 35 pcs, green screen, 4k camera, free snacks, raffles for keyboards, mouse, headsets!!! My 8 year old won a new MSI VIGOR keyboard!! It’s such a clean facility, low key for real gamers.", n: "Holly S." },
    { q: "Great place, completely free and great setups.", n: "Edward C." },
    { q: "Impressive work", n: "Joshua H." },
    { q: "This place is awesome with some of the best specs for pcs and driving simulators. Super cool place that imitates the vibes of a gaming cafe.", n: "Bucket B." },
    { q: "Fun fun fun", n: "Jean Pierre C." },
    { q: "I recently visited the Newegg GamerZone and had a great experience. The atmosphere is really nice, especially if you have a small group of gamer friends to hang out with. The space has a dark, modern vibe that feels comfortable and immersive without being overwhelming. There are plenty of PCs set up for demonstrations, giving visitors a chance to check out different hardware and gaming setups. It's a fun place to explore the latest technology and see what different systems can do. Another nice touch is the availability of snacks, which makes it easy to spend some time there without needing to leave. Overall, it's a fun destination for gamers who want to try out new equipment, spend time with friends, and enjoy a relaxed gaming environment.", n: "Randy W." },
    { q: "my friend comes here all the time and i finally came with her a couple weekends ago. it’s so nice!!! there’s plenty of desktops and they even have racing and VR setups. the staff are so helpful and friendly too. i’ll definitely be coming back :)", n: "Cece Y." },
    { q: "It’s an amazing place to bring your friends or family. It’s free to play and free food and drinks", n: "Dragon L." },
    { q: "Immersive venue for gaming and creators. Lots of PCs and also racing, VR and console games.", n: "Vicki C." },
    { q: "Very fun", n: "Johnny K." },
    { q: "Great and beautiful gaming room!", n: "Aaron" },
    { q: "Amazing place very friendly", n: "Augusto O." },
    { q: "Thank you so much it was so fun definitely coming back", n: "Darlene M." },
    { q: "Service is amazing everyone is very nice. The atmosphere is very fun and the food is great.", n: "Kaitlin P." },
    { q: "Great place super friendly", n: "Jaisel R." },
    { q: "I came with my friends last time and all my friends are shocked -this what dreams are made of! Wish i found out this place earlier!!", n: "구리스" },
    { q: "Love this space! Love the people, service and ambience. And free food", n: "Cath P." },
    { q: "A cool, intimate place to chill out and play some video games for free. The people there are chill.", n: "Star S." },
    { q: "Cool place very clean nice tech", n: "Ronald S." },
    { q: "They are very helpful with needed tech issues.", n: "Steven T." },
    { q: "Perfect gaming zone for gaming. Good place to game and vibe.", n: "Shawn H." },
    { q: "Came here on a Tuesday after work finished, around 5 pm. It was pretty easy to find, there are signs both outside the plaza, inside the plaza, and even inside the building. Once you step in, you get registered for an account to play at the Gamer Zone. It was pretty quick. They have around 10 computer stations, 3 driving seats (each with 3 monitors), a VR station, a really cool seat with monitors all around, and I think 3 streaming stations. There is also a console station with a big TV. It was actually really cool! All the computers have most of the popular games, and if you run out of credits, just let the front know and they can add more onto your profile. They also have free snacks and drinks. Just ask the front! They have lots of events every day, just check their instagram page.", n: "Elizabeth X." },
    { q: "Always a good time at their events. They have a gamer zone where you can play games. They also have raffles where you can win some of their great products. Very fun and educational as well.", n: "S. Cobar" },
    { q: "This place is so cool", n: "Klocky" },
    { q: "Great spot to choose to hangout with your friends, vibe is really great, employees are also really nice and welcoming, and it’s so CLEAN!! Definitely a MUST when your around", n: "肥仔Kai" },
    { q: "Love this place! Events every week and it’s FREE. Come out and have fun!", n: "Robert P." },
    { q: "Super fun place to hang out with friends!", n: "Kaia" },
    { q: "Newegg Gamer Zone is a fun place to chill out and play some games. I like to come almost every week for the Fortnite coaching sessions and tournaments that are held Wednesdays and Fridays. Good events, good food, and good giveaways", n: "Alijah C." },
    { q: "Got great events, great giveaways and opportunities to use their PC's.", n: "Soki C." },
    { q: "Really nice set ups, great ambiance and vibe. They hold raffles and various events as well!", n: "Ezekiel A." },
    { q: "I love coming here! It's so close to home and the facility is clean and well-maintained. The best part is that using their PCs and gaming sims is completely free! You just have to register for an account and then you sign in whenever you visit. My friend and I come here every couple of weeks for a chill day of gaming. They have so many games and if there isn't any, you can always ask to see if they can add what you'd like to play. The staff are really nice and friendly, shout-out to Cindy and Eric, who are always so helpful and welcoming. This place is truly a hidden gem.", n: "Stephanie C." },
    { q: "A beautiful, well-maintained space that is free and with super friendly and helpful staff! Lovely place to spend an afternoon with friends!", n: "Grace K." },
    { q: "I had the best time here! My friends and I tried out the VR. Everything was completely free and the staff was super friendly and welcoming.", n: "Jenny T." },
    { q: "This place is so amazing. My friends and I booked a session here and they gave us free snacks, set up various games for us, and even equipped us with all of the high tech VR stuff!! It's too good to be true.", n: "Prince H." },
    { q: "The events that you create are so much fun! Look forward for future events.", n: "N. I." },
    { q: "Just did a non-alcoholic bartending event here and everyone is super nice. Definitely come and support this place. I was told all you need is to create an account. Its all FREE! Come check these guys out 10/10 and FREE snacks come support these guys!", n: "Colton W." },
    { q: "went with my boyfriend, had a little trouble finding the entrance but once you get in the building there are arrows pointing to the room. the nice ladies at the counter were helpful with setting up an account for our first time. they have different gaming devices, some still being set up and free snacks as well. liked the cleanliness & service, would take more people back!", n: "jas" },
  ];

  const FADE_MS = 420;
  // Dwell time scales with how much there is to read: a 3-word quip and a
  // 400-word paragraph shouldn't both get exactly the same amount of time
  // on screen. ~200wpm reading speed is roughly 17 characters/sec including
  // spaces; MIN/MAX keep even the shortest and longest reviews from ever
  // flashing by too fast or overstaying past a minute.
  const MIN_MS = 6000, MAX_MS = 16000;
  function dwellFor(r) { return Math.max(MIN_MS, Math.min(MAX_MS, r.q.length * 60)); }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function cardHTML(r) {
    return `<div class="review-stars" aria-hidden="true">★★★★★</div>
      <p class="review-quote">${GZ.esc(r.q)}</p>
      <p class="review-source dim">${GZ.esc(r.n)}, Google Review</p>`;
  }

  const pool = shuffle(REVIEWS);
  const slot = wrap.querySelector('.review-card');
  if (!slot) return;
  let cursor = 0;
  function next() {
    const r = pool[cursor % pool.length];
    cursor++;
    return r;
  }

  // Pre-measure the single tallest review against the card's real markup
  // and current width, then lock the slot to that height -- so cycling
  // through reviews of wildly different lengths never grows or shrinks the
  // box (or the page around it). Re-measured on resize (debounced) since
  // a narrower box wraps the same text into more lines.
  const measurer = slot.cloneNode(false);
  measurer.style.position = 'absolute';
  measurer.style.visibility = 'hidden';
  measurer.style.pointerEvents = 'none';
  measurer.style.height = 'auto';
  measurer.setAttribute('aria-hidden', 'true');
  wrap.appendChild(measurer);
  function remeasure() {
    measurer.style.width = slot.getBoundingClientRect().width + 'px';
    let max = 0;
    for (const r of REVIEWS) {
      measurer.innerHTML = cardHTML(r);
      max = Math.max(max, measurer.scrollHeight);
    }
    slot.style.minHeight = max + 'px';
  }
  remeasure();
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(remeasure, 200);
  });

  // Seed the one visible slot with a starting review.
  slot.innerHTML = cardHTML(next());

  if (reduceMotion || pool.length <= 1) return; // nothing left to rotate into

  function tick() {
    slot.classList.add('is-fading');
    setTimeout(() => {
      const r = next();
      slot.innerHTML = cardHTML(r);
      slot.classList.remove('is-fading');
      setTimeout(tick, dwellFor(r));
    }, FADE_MS);
  }
  setTimeout(tick, dwellFor(pool[0]));
})();
