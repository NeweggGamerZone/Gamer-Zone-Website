# UX Flows, Personas & Information Architecture

The design principle for this site: **the room is the product; the site is its heartbeat.** Every page should answer one visitor question and end with one action. GZ's magic is that it's free, alive, and human — the site must feel updated, personal, and slightly hand-made (graffiti, stickies, photos), not like a corporate promo page.

---

## 1. Personas

### P1 — "Regular Ray" (daily local gamer) — primary
Lives/works within 20 min. Has visited. Wants: *what's the theme tonight, is GZ open, who else is going?*
Success: checks the site weekly like a menu; brings a friend to a theme night; signs the wall.

### P2 — "First-Time Fiona" (curious local)
Heard "free gaming lounge??" from a friend/Instagram. Skeptical it's really free. Wants: proof, photos, hours, what to expect walking in.
Success: books a Free Play reservation or just shows up Saturday.

### P3 — "Remote Remy" (global Newegg customer)
Buys from Newegg, lives in Texas/Germany/anywhere. Will likely never visit. Wants: to belong anyway — memes, wall signatures, watching tournament results, voting.
Success: joins Discord, submits a wall post, shares GZ meme.

### P4 — "Vendor Vanessa" (brand/vendor partner)
Marketing manager at a hardware brand. Wants: proof of engaged community, event formats, cost/logistics, who to contact.
Success: submits event inquiry.

### P5 — "Educator Eddie" (school/STEAM)
Teacher or youth org lead. Wants: field trip / PC-building workshop info, safety, age policy.
Success: submits group event application.

---

## 2. Sitemap / UI Map

> **v2 update (Jul 2026):** pages consolidated 7 → 5. Visit merged into Home (`#visit`), Community merged into The Wall (`#community`, `#rewards`), and a dedicated **EDU** page added (workshops from youthai.newegg.org + XP League esports training). Nav: Home · Events · The Wall · EDU · Partners. Design language: Newegg navy #002D6A + orange #FA9D28 on GZ black, flat single-color SVG icons (no emoji), flyer-style HUD frames, scroll-reveal/parallax/3D-tilt effects. The map below reflects v1 flows; the flows and design implications still apply.

```
┌──────────────────────────────────────────────────────────────┐
│ NAV: Home · Events & Calendar · Visit · The Wall · Community │
│      · Partners & EDU · [Rewards — coming soon]              │
└──────────────────────────────────────────────────────────────┘

HOME (index.html)                        ← P1/P2 landing
 ├─ Hero: "Free-to-play gaming lounge at Newegg HQ" + photo
 ├─ "This Week at GZ" strip (weekly theme-night image, auto)
 ├─ Next Big Event card (from events.json)
 ├─ Wall Highlights (3 rotating approved posts) → The Wall
 ├─ "What's inside" icons: PCs · Sim Racing · VR · Esports · Free Snacks
 └─ Footer: hours, address, IG, Discord, reservation link

EVENTS & CALENDAR (events.html)          ← P1 core loop
 ├─ Current Monthly Calendar (image, auto from drop folder)
 ├─ Weekly Theme Nights (current + next, auto)
 ├─ Upcoming events list (events.json, structured)
 └─ 📦 ARCHIVE (auto: past images grouped by month, collapsible)

VISIT (visit.html)                       ← P2 conversion page
 ├─ Hours / closures note ("check calendar — private events")
 ├─ Address + Google Maps link + parking
 ├─ What to expect: stations, free snacks, walk-in vs reserve
 ├─ House rules & under-18 guardian policy
 └─ FAQ ("Is it really free?" — yes.)

THE WALL (wall.html)                     ← P1/P3 community core
 ├─ Graffiti/sticky-note grid of APPROVED posts
 │   types: 📝 note · 😂 meme · 🏆 prize brag · 🎮 LFG · 🔧 tech tip
 ├─ Filter chips by type
 ├─ "Sign the Wall" form → pending queue (admin reviews)
 └─ Remote fallback: "Post via Discord #gz-wall"

COMMUNITY (community.html)               ← P3 + retention
 ├─ Discord CTA (the everyday home)
 ├─ Remote activations (see 05-COMMUNITY-ACTIVATIONS.md)
 ├─ LFG: find locals to group up with (via wall LFG posts + Discord)
 └─ Tech corner: setup/optimization advice threads (Discord-anchored)

PARTNERS & EDU (partners.html)           ← P4/P5 (20%)
 ├─ Why GZ: community stats, event formats, past highlights
 ├─ Event types: vendor showcase · product launch · tournament ·
 │   influencer/creator · school workshop · private booking
 ├─ How it works: inquiry → 10-business-day response → run of show
 └─ CTA: reservation/event application + contact

REWARDS (rewards placeholder on community page + nav)
 └─ "GZ Passport coming soon" + join Discord/IG to be first to know

(hidden, unlinked) gz-ops-review.html    ← admin only
 └─ password gate → pending posts → approve/reject → export posts.json
```

---

## 3. Ideal Customer Flows

### Flow A — Weekly regular check-in (P1) — THE core loop
```
Opens site (bookmark/IG bio link)
→ Home hero shows THIS WEEK's theme night image (zero clicks)
→ taps Events for monthly calendar → screenshots it
→ sees "Friday: Sim Racing Showdown" → pings friends via Discord LFG
→ visits GZ → signs the wall on the kiosk ("PR'd on the sim! 🏁")
→ next week: comes back to see their note published on the site
```
**Design implication:** the current weekly image must be on Home above the fold. The wall closes the loop — *your visit leaves a visible mark*, which is the retention hook.

### Flow B — First-time discovery (P2)
```
IG post / friend's link → Home
→ "Wait, free?" → Visit page: hours, photos, FAQ, guardian policy
→ confidence moment: sees wall posts + calendar = "this place is alive"
→ clicks Reserve Free Play (or notes walk-ins OK) → visits
→ staff points to kiosk: "sign the wall before you go"
```
**Design implication:** Visit page must kill every objection (cost, parking, age, "do I need to book"). Liveliness = social proof; the wall and fresh calendar ARE the testimonials.

### Flow C — Remote participation (P3)
```
Sees GZ meme or tournament clip on Newegg socials → site
→ The Wall: reads notes from Diamond Bar locals + world
→ submits own note via Discord #gz-wall (mod approves → on site)
→ Community page: joins monthly global activation
   (e.g., "Global Setup Showdown — post your battlestation")
→ becomes ambient member: checks wall monthly, votes on memes
```
**Design implication:** never gate anything on being physically present. Every activation needs a remote lane. The wall shows a 🌍 badge on remote posts — locals see the world watching, remotes see they count.

### Flow D — Vendor inquiry (P4)
```
Hears about GZ (sales contact / press / this site)
→ Partners page: formats, photos, "how it works," community proof
→ submits event application → Eric follows up with run-of-show
```
**Design implication:** partners page is a pitch, not a brochure — lead with community energy (wall volume, event photos), end with one clear CTA.

### Flow E — Admin publish loop (Eric, ~15 min every 2 weeks)
```
Drop new calendar/theme images into named folders
→ git push (or ask Cowork) → Action rebuilds manifest → site updates,
  old images auto-archive
→ open gz-ops-review.html on kiosk → approve wall posts → export
  posts.json → commit → wall updates
```

---

## 4. Page-level UX Notes

- **Tone:** gamer-native, warm, a little cheeky. "Free to play. Free snacks. For real." Never corporate-speak on customer pages; Partners page can be more polished.
- **Above-the-fold rule:** Home = this week's theme night. Events = current calendar. Visit = hours+address. Wall = the notes themselves (form below).
- **Mobile-first:** regulars check on phones. Calendar image must pinch-zoom / tap-to-full-size.
- **The wall aesthetic:** rotated sticky notes, varied colors, marker-style font for authenticity; approved-only keeps it safe. Each note: text (≤280 chars), name/gamertag, type tag, date, optional 🌍 remote badge.
- **Liveliness signals everywhere:** "Updated <date>" stamps, latest wall posts on Home, archive proves history.
- **Accessibility:** alt text on calendar images (also list events as text in events.json so screen readers/SEO aren't image-blind — images alone are not enough).
