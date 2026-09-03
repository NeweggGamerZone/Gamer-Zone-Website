/* Reviews waterfall -- 2026-08-26 "Pinterest / loved-by" redesign.
   History: this section started as a static grid of all 63 written
   Google reviews (plus a line naming 23 more 5-star-no-text reviewers) --
   every card stretched to match its row's tallest sibling, producing huge
   blank space under short reviews. A later "waterfall" version showed 4
   cards at once cycling on staggered timers -- but with review lengths
   from a 3-word quip to a 400+ word paragraph, whichever slot swapped in
   a much longer/shorter review made the whole grid row (and the section
   under it) visibly grow or shrink every few seconds, so it was pulled
   back to one review at a time in a fixed-height box.

   This version: two GZ.marquee lanes (see main.js), scrolling opposite
   directions, each card capped to a fixed width with its quote clamped to
   5 lines (see .review-waterfall .review-quote in style.css). This
   sidesteps BOTH earlier failure modes at once -- line-clamp means no
   card's real height ever depends on how long its review is (fixing the
   stretch/blank-space problem from the original grid), and a horizontal
   marquee lane's own height never changes over time regardless of which
   reviews are currently scrolling through it (fixing the grow/shrink jank
   that killed the second version). A card whose quote gets clamped still
   has its full text reachable via the same hover/tap data-full popup
   `.game-list li` already uses (see style.css) -- nothing is ever fully
   unreadable, just collapsed by default the way a long dense list is
   elsewhere on this site (CLAUDE.md core rule 1's own carve-out for this
   shape of content).

   The review pool is baked in directly below rather than fetched from a
   data/*.json file: unlike events.json (edited often, shared across
   multiple pages, needs an offline-browsing fallback), this list is
   static site copy that only this one section uses, so a fetch would
   just add a network round-trip and a flash-of-empty-cards while it
   resolves, for no real benefit. */
(function () {
  const wrap = document.getElementById('review-waterfall');
  if (!wrap) return;

  // 63 written Google reviews (5 stars each), captured in an earlier sync
  // with Google's listing. The aggregate stat line in index.html
  // ("5.0 rating · 110 Google reviews") is refreshed daily against the
  // live Google Business Profile count (still 5.0, now 110 total reviews
  // as of 2026-09-03, up from 109) -- this written pool is NOT re-scraped
  // by that daily refresh (per request, it only updates the quantity, it
  // never adds/edits written reviews), so the gap between 63 written here
  // and the real total will keep growing over time (47 unwritten 5-star
  // ratings as of this count). Re-sync this pool itself in its own pass
  // if the written reviews ever need refreshing.
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

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // data-full backs the same attr(data-full) hover/tap popup as
  // .game-list li[data-full] (see style.css) -- a fallback for whichever
  // reviews get cut off by the 5-line clamp. tabindex="-1" keeps every
  // card out of the normal Tab sequence (see that rule's own comment for
  // why) while still letting a click/tap focus it to reveal the popup on
  // touch devices, which have no :hover.
  function cardHTML(r) {
    const full = GZ.esc(`“${r.q}” — ${r.n}`);
    return `<div class="card review-card" tabindex="-1" data-full="${full}">
      <div class="review-stars" aria-hidden="true">★★★★★</div>
      <p class="review-quote">${GZ.esc(r.q)}</p>
      <p class="review-source dim">${GZ.esc(r.n)}, Google Review</p>
    </div>`;
  }

  // Two lanes, shuffled once per page load (not re-shuffled after -- see
  // GZ.marquee for why nothing changes post-render) so a repeat visitor
  // sees a different real mix each time without any runtime jank. 24 of
  // the 63 written reviews is enough for two dense-feeling lanes without
  // shipping the entire pool's worth of DOM/text on every homepage load;
  // "Read our Google reviews" below links out to the rest -- real link,
  // not a fabricated "see more" that goes nowhere.
  const pool = shuffle(REVIEWS);
  const COUNT = Math.min(24, pool.length);
  const picked = pool.slice(0, COUNT);
  const mid = Math.ceil(picked.length / 2);
  const row1 = document.createElement('div');
  const row2 = document.createElement('div');
  wrap.append(row1, row2);
  GZ.marquee(row1, picked.slice(0, mid).map(cardHTML), { speed: 26 });
  GZ.marquee(row2, picked.slice(mid).map(cardHTML), { speed: 26, reverse: true });

  wrap.addEventListener('click', e => {
    const card = e.target.closest('.review-card[data-full]');
    if (card) card.focus();
  });
})();
