# Newegg Gamer Zone Website — PRD (v4, MVP re-scope)

**Owner:** Eric Ni · **Updated:** July 21, 2026 · **Repo:** github.com/NeweggGamerZone/Gamer-Zone-Website (GitHub Pages)

> The interactive review surface for this spec is the **GZ Planning artifact** (side panel) — PRD, personas, UX map, wireframes, MVP split, Zone Points, Discord, and Verkada plan in one click-through. This markdown is the written record.

## 1. What changed this round (v3 → v4)

- **Hours are canonical:** Tuesday–Saturday, 10 AM–7 PM. *(You wrote "Tuesdays 10am–7pm" — confirm if you meant Tuesday-only vs the Tue–Sat that matches Linktree/press. Assuming Tue–Sat.)*
- **Phone:** (626) 271-9700 **ext. 29900**.
- **Reservation → Verkada, gradually.** Goal: retire the Newegg reservation page and let guests pre-sign a Verkada guest link. The **Visit** section tries the **Verkada daily link first**, reservation as fallback. A Cowork scheduled task grabs the day's Verkada web sign-in link each morning (backend).
- **Cut the Graffiti Wall / Bulletin** and its entire moderation backend (pending queue, hidden admin, posts.json). Archived under `archive/site-v3/`.
- **Cut the Partners page.** Partner/vendor message becomes a **rolling banner at the bottom of Home** (one line + "host an event" link).
- **New: Zone Points leaderboard** — Top 10 recurring visitors (username + Zone Points), fed by a SENET xlsx export.
- **New plan: a dedicated Gamer Zone Discord** as the home for game nights + Looking-for-Group (LFG), replacing on-site community features.
- **Scrapped the built HTML** to refine UX map + skeletons + PRD before rebuilding.

## 2. Identity & audiences

*One part EDU, one part Gaming, one part Esports. One part vendors, one part customers.* Focus: 80% daily/ local gamers, 20% vendors/partners/EDU.

## 3. MVP scope — pages vs. backend

**Front-end pages (4):**
1. **Home** — hero (GET IN THE ZONE), This Week at GZ (flyer rail), What's Inside, Plan Your Visit (Verkada-first + hours + map + phone), Top-3 Zone Points teaser, Discord CTA, **rolling partner banner**, footer link hub.
2. **Events** — weekly flyers + monthly calendar image + auto-archive.
3. **EDU** — workshops (from youthai.newegg.org) + XP League training/tournaments.
4. **Leaderboard** — Top 10 username + Zone Points + scoring guide.

External (not pages): **Discord** (game nights, LFG), Start.GG, Eventbrite, Meetup, Instagram, Newegg Deals — all in the footer hub.

**Backend / automation (no UI, run by Cowork or scripts):**
- **Verkada daily link:** morning scheduled task fetches the day's guest sign-in URL → writes `verkadaDailyUrl` + date to `config.json`. Visit CTA uses it; falls back to the static Verkada site link, then reservation.
- **Leaderboard pipeline:** Eric drops the SENET export in `/Leaderboard/*.xlsx` → script computes Zone Points → writes `data/leaderboard.json`.
- **Referrals:** friends-referred counts are **manually entered via a minimal admin page** (the only surviving admin surface) → merged into the leaderboard score.
- **Events/flyers:** existing drop-folder → manifest automation.

## 4. Zone Points (leaderboard scoring)

Zone Points = session engagement + referrals, per player, per month.

| Input | Points | Source |
|---|---|---|
| Session time (hours) | 10 pts / hour | SENET xlsx |
| Average session time (hours) | 10 pts / hour | SENET xlsx (rounded up) |
| Friends referred | 100 pts / visitor | manual (admin page) |

**Public guide shows only the plain weights** (no "rounded up" / "manually entered" notes):
*Session Time — 10 pts/hour · Average Session — 10 pts/hour · Friends Referred — 100 pts/visitor.*

Display: **username + Zone Points** (game of choice optional). Monthly reset; monthly prizes later. Data is date-based off the dropped xlsx so months can be archived.

## 5. Community: Gamer Zone Discord (plan)

Stand up a dedicated **Newegg Gamer Zone** Discord (or a GZ category in the main Newegg server) as the live community layer the website intentionally does NOT try to be:
`#announcements` (event drops) · `#lfg` (looking-for-group) · `#game-nights` (weekly signups + reminders) · `#tech-corner` (setup/optimization) · `#clips-and-memes` · `#leaderboard` (monthly Zone Points + prizes). Website points to Discord for anything real-time/social; keeps the site static and low-maintenance.

## 6. Verkada pre-registration (visit flow)

Today: guests reserve via Newegg's page. Target: guests pre-sign a Verkada guest link so check-in is instant. Visit logic (priority order): **1)** today's Verkada daily link (if backend populated it for the current date) → **2)** static Verkada guest site → **3)** Newegg reservation page. Walk-ins always welcome.

## 7. Open questions

1. Hours: Tue–Saturday confirmed? (You wrote "Tuesdays.")
2. Discord: new standalone GZ server, or a category inside discord.gg/newegg?
3. Leaderboard: exact SENET column names in the export (so the parser maps correctly)?
4. Referral admin: tiny hidden page (localStorage → export) vs. Eric editing a `referrals.json` directly?
5. Does the Verkada guest link change daily (needs the morning fetch), or is the static site link enough for MVP?
