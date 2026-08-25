# Usability Audit + Roadmap — 2026-08-25

**Owner:** Eric Ni · **Scope:** post-merge snapshot of `main` at commit `5235038`, all 5 pages (Home, Events, Games, Academy, Ambassador), desktop (1400px) + mobile (400px).

This is a planning reference, not a bug list — everything flagged below is either a genuine (small) usability friction point or a forward-looking recommendation. Nothing in Part 1 blocked the merge to `main`.

---

## Part 1 — Usability assessment, page by page

**Home.** Hero mini-game is playable and the fix from this round holds up across viewport sizes. The "SCORE / BEST" readout and "arrow keys to move and jump" hint are small and sit below the fold of the visual action — a fast scroller could miss that the hero is interactive at all before scrolling past it. Nothing else on Home needs attention; the Weekly Lineup, About carousel, Reviews, 3-card Visit row, Ambassador teaser, and Discord CTA all read clean with clear hierarchy. One structural note: there's no persistent "Preregister" affordance while scrolling past the hero — a visitor who decides mid-scroll that they want to preregister has to scroll back up or down to the Visit section.

**Events.** The registration steps, calendar, and Weekly Lineup board are all clear and functional. Past Events currently holds a single recap (Street Fighter Saturday Slam). That's correct today, but it's worth a reminder that this section needs an ongoing content habit — after a few more public events pass without a recap added, "Past Events" will read as stale rather than sparse.

**Games.** Truncation is fixed this round (see below). The SENET chart is genuinely real for All-Time but simulated (reseeded daily) for This Week/This Month — a regular who checks their own session hours against the chart and doesn't see them reflected could read that as the chart being fake, when it's really just an honest MVP compromise documented in the code but invisible to a visitor. The ~90-title PC list has device/genre filter chips but no text search; that's fully usable today, but if the library keeps growing, scanning becomes real work.

**Ambassador.** Now that Featured Ambassadors are correctly all-Diamond (see Part 2), the value proposition is clear and the tier ladder is legible. The one real gap: there's no way for an existing ambassador to check their own progress toward the next tier — they'd have to ask staff directly. That's a genuine usability hole once the program has more than a handful of active hosts, and it's the same gap Eric raised as the tracking-system question (see Roadmap #1).

**Academy.** Both workshop tracks (AI in Game Design, PC Building 101) show "Closed" back to back. If that's the actual current state, it's accurate — but a first-time visitor seeing two "Closed" buttons in a row with no next-cohort date can read it as "this program isn't really running," which undercuts the page's own pitch. Worth a copy/ops fix (a waitlist link or next-cohort date) whenever a cohort actually is closed, independent of any code change.

**Cross-page.** Contrast, mobile parity, and external-link-in-new-tab behavior are all already solid from earlier passes and held up in this audit. No horizontal overflow, no console errors, at either breakpoint on any page.

---

## Part 2 — What changed this round

- **Games list truncation** replaced 1-line ellipsis with a uniform 2-line wrap (`min-height` reserved on every row) — titles are readable without a hover, and every row is the same height whether the title is short or long. Only the one exceptionally long title still falls back to browser ellipsis + the existing hover/tap popup.
- **Featured Ambassadors reconciled to the real design intent:** every card is Diamond tier again (featuring is the *reward* for reaching Diamond, not a progress demo — mixing tiers there was a misread on my part last round, now corrected). Variety comes from entity type instead: a 4th example card represents an organization (a fictional collegiate esports club, "Ridge Valley Esports") with a distinct square/bordered avatar and an "Organization" tag, so the section doesn't read as four identical people, without breaking the all-Diamond rule.

## On the tracking-system question

Eric asked directly: if the Featured Ambassadors section isn't hitting hard enough, should we build a system to track all ambassadors?

Short answer: not yet at current scale, but it's the right next investment once the program has real volume. Today, featuring is (and should stay) a manual, curated decision — a staff member decides an ambassador is real, has actually hit Diamond, and is a good public face for the program. That curation step is a feature, not a bug: it's what keeps the page from auto-publishing someone's name/socials without a human check. What's missing is the bookkeeping underneath it — right now there's no structured record of how many events each ambassador has actually hosted, so "did they hit Diamond yet" is tracked informally (memory, email, a spreadsheet somewhere). That doesn't scale past a handful of active ambassadors before someone crosses Diamond and it goes unnoticed for weeks. This is Roadmap item #1 below.

---

## Part 3 — Simulated user feedback

Fictional personas, built to stress-test the site from different angles. Not real visitors or real quotes — a planning aid, standing in for the round of real testing Eric is about to run himself.

**Jaden, 16, drops in most Saturdays.** "The weekly theme thing is cool, I like seeing what's up before I even walk in. I didn't realize the triangle thing on the home page was a game until I scrolled past it once and came back — maybe make that more obvious."

**Priya, parent looking into the PC Building workshop for her son.** "The page told me clearly what the workshop covers and how many sessions, which I liked. Both tracks said 'Closed' though, and there was no 'next session' date, so I wasn't sure if this was even something we could still sign up for or if we'd missed it entirely."

**Marcus, part-time streamer considering the Ambassador program.** "I like that it calls out influencers by name in the intro, and the class system (Shield/Sword/Bow) is a fun way to frame it instead of just three boring checkboxes. My one question after reading the whole page: once I apply and start hosting, how do I actually know how close I am to Diamond? Do I just email you guys?"

**Devonte, officer for a community college esports club.** "Most of these 'become an ambassador' pages assume you're a solo streamer. Seeing an actual club example (Ridge Valley Esports) on the Featured list told me orgs are welcome here too, not just individual influencers — that mattered more to me than any of the copy."

**Grace, found the Zone through a Google search, never been.** "The reviews and the star rating built trust fast. The new About/Visit Us/Preregister three-card layout answered my three actual questions (what is this place, where and when, how do I get in) without me having to hunt around the page."

**Alex, navigates mostly by keyboard.** "The games list works with Tab now — I can land on a truncated title and see the full name pop up, which a lot of sites get wrong. The calendar was a little less obvious to operate by keyboard, but I didn't hit anything broken."

---

## Part 4 — Roadmap (supersedes the earlier starter ideas)

The Community Activations doc's original ideas (Graffiti Wall, GZ Passport, a standalone Discord server, World Wall Map) are being sunset per Eric's call — they were early brainstorm-stage ideas that didn't hold up once weighed against what actually moves the site forward. The items below are scoped against what's *already built* rather than starting from a blank page, which is why they're bigger and more load-bearing than the old list.

**1. Ambassador program backend (tier tracking + status page).**
Directly answers the tracking-system question above. A lightweight event-log (staff logs each hosted event per ambassador — reuses the same lightweight-admin pattern already used for referral tracking) feeds automatic tier computation, flags anyone who's just crossed Diamond for a staff-reviewed featuring decision, and gives each ambassador their own progress lookup (SENET-ID-style lookup, no account/login system needed) so "how close am I" stops being an email question. This turns the Ambassador page from a static pitch into an operating program.

**2. Live SENET data pipeline.**
The Games page's All-Time numbers are real; This Week/This Month are still simulated, by design, until a small read-only proxy exists (already scoped in `senet-chart.js`'s own header comment — a scheduled job that logs into the real Senet admin panel server-side and writes JSON the static site can fetch). Closing this gap makes the whole Live-at-the-Zone chart trustworthy, not just the headline number.

**3. Unified visitor identity, anchored on the SENET ID.**
Every guest already registers a SENET ID at check-in. That's a ready-made anchor for a lightweight persistent profile — personal play-time history, visit streaks, badges — without building a login system. This is the more meaningful, data-backed successor to the old "Zone Points leaderboard" idea: same spirit (recognize regulars), but built on real check-in data instead of a manually-dropped spreadsheet.

**4. Vendor/Partner showcase.**
The site's own stated identity is "one part vendors, one part customers," but vendors currently only get a rolling banner line. The Ambassador program just proved out a full pattern — tiered application, showcase cards, reward structure — that a Partner program could reuse directly at low build cost, giving vendors a real showcase instead of a footnote.

**5. Automated weekly social export.**
The screenshot-based 1:1/16:9 Weekly Lineup export pipeline already exists and produces polished output; today it still has to be run by hand. Scheduling it end-to-end (generate + stage for posting each week) removes a recurring manual step and keeps the marketing motion consistent even on a busy week.

**6. Live "Zone status" widget (stretch).**
Using the same daily Verkada-link automation that already exists for check-in, surface a simple "open now / free play today" live indicator on Home instead of static hours text. Lower priority than 1–5, but a distinctive touch for a venue whose whole pitch is being live and social.
