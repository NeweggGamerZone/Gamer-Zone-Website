# Project instructions — Newegg Gamer Zone website

**Read `docs/01-PRD.md` through `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` for product context first.** This file is the standing rulebook: engineering/design rules and the QA process that apply to *every* future session on this repo, regardless of which specific task is being worked. Task-specific reasoning belongs in code comments near the relevant code, not here — this file is only for rules that should survive across sessions.

This is v1 of this file, consolidated 2026-08-26 from everything established across the site-wide cleanup/audit work. Treat "Core rules" below as unbreakable unless Eric explicitly overrides one in a conversation — and if he does, update this file in the same session so the exception doesn't get silently lost.

---

## Core rules (unbreakable)

1. **No ellipsis truncation in small card grids.** Let text wrap; let the row grow. See "Text overflow" below.
2. **No decorative effect (texture, glow, shine, background) may reduce text readability**, at rest or mid-animation. See "Readability" below.
3. **Every shine/metallic-flash effect reuses the one shared `gz-shine` implementation.** Never write a new bespoke shine. See "Unified shine" below.
4. **Never fabricate a specific fact** (a date, a stat, a quote, an admin-portal capability) that isn't confirmed real. Offer an honest alternative instead (a waitlist link, "not yet scheduled," a roadmap note). See "No fabrication" below.
5. **Never call a responsive/sizing change done without rendering it.** Real screenshots at mobile (~390–400px), tablet (~768–820px), and desktop (~1280–1400px+), not a CSS value that "should" work. See "Container & sizing discipline" below.
6. **Never call an interactive feature (game, widget) done from the absence of console errors alone.** Actually drive it with simulated input over real time. See "Testing interactive features" below.
7. **Every new interactive element is keyboard-operable**: reachable via Tab, has a visible focus state, and supports the input pattern users expect (Enter/Space to activate, arrow keys for grid/list navigation). See "Keyboard accessibility" below.
8. **Run the QA checklist at the end of this file before considering any change finished, and again before pushing to `main`.**
9. **Every visitor-facing change should make someone feel more wowed, seen, or accepted — never less.** These are real design goals, not vibes. See "Soft goals" below, and run the gut-check in the QA workflow.

---

## Text overflow in small card grids: no ellipsis

Applies to small, fixed-cardinality card grids — Featured Ambassadors, About Gamer Zone side cards, Visit/About/Preregister cards, and anything of that shape added later. Does **not** apply to long, dense list layouts (e.g. the Games catalog list), where a rare-case ellipsis + hover/tap popup fallback is the correct tradeoff — see `assets/css/style.css`'s `.game-list li .gl-name` comment for why that context is different.

In a card grid:

- Never truncate text with `text-overflow: ellipsis` or `-webkit-line-clamp` to force a card to a fixed height. If content is too long, let it wrap to as many lines as it needs.
- Rely on CSS Grid's default `align-items: stretch` (do not override it) so every card in a row auto-matches whichever card is currently tallest. One long name making one card taller makes the *whole row* a little taller, evenly — it should never look like a cut-off card sitting next to clean ones.
- Prefer shortening the actual copy first if something is unreasonably long (e.g. an example organization name), but the layout itself must never depend on clipping to look tidy — it has to hold up even if the copy can't be shortened.

`.host-card` in `assets/css/style.css` is the reference implementation.

## Readability: WCAG-grade contrast, always, including mid-animation

No decorative texture, glow, shine, or background effect ships (or stays shipped) at a strength that makes text harder to read. This isn't a vibe check — hold it to a real bar:

- **Target WCAG 2.1 AA contrast**: at least 4.5:1 for normal text, 3:1 for large text (≥24px, or ≥19px bold) and for meaningful UI/graphical elements, against whatever is actually behind them — including a decorative effect's *brightest* moment, not just its resting state. A brief animated flash that drops a text region below that ratio for even part of its cycle is a real bug, not an acceptable trade for "it's only for a second."
- **Z-index every layer explicitly.** Any element that layers a decorative background behind real text must keep every text/interactive child at a higher `z-index` than the effect — check this explicitly, don't assume default stacking gets it right. The 2026-08-25 "grids make the text unreadable" bug happened because `.mile`'s content (`.unlock`, `ul`, `.mile-count`, `.rank-badge`) had no `z-index` at all, so the shine painted on top of it.
- **Keep decorative opacity low enough to read as flavor, not as a competing pattern.** If a texture reads as "a grid," "noise," or any other recognizable pattern in its own right rather than a subtle surface finish, it's too strong — this project's tier crosshatch texture went through two rounds of opacity cuts before being removed outright on 2026-08-26 because it never stopped competing with the card's own text. When a texture keeps needing readability rescue passes, the right fix is often to cut it, not tune it further.
- **Check this on every visual/design pass**, the same way the no-ellipsis rule gets checked — don't just check "does the effect look cool," check "is every line of text on this component still comfortably legible with the effect running," at rest AND at its most visually intense moment.

## Container & sizing discipline

Lessons paid for the hard way this project (the Weekly Lineup mobile-clipping bug, the hero-game sizing miss) — don't re-learn these:

- **`aspect-ratio` on a plain block element is a forced size, not a floor.** Unlike a flex/grid *item*, a plain block gets no automatic content-based minimum size — combined with `overflow:hidden`, content taller than the ratio-derived height gets silently clipped instead of the box growing. If a component's content length is unpredictable (event lists, user-generated text, etc.), use `min-height` (a genuine floor that still lets the box grow for real content) instead of `aspect-ratio` to approximate a square/ratio look.
- **When one component's size depends on another's, tie them together with shared math, not two independently hand-tuned numbers.** The hero game's ground shape is deliberately computed from the exact same `A` constant that scales the decorative background rings (`assets/js/techno-hero.js`), so they can't silently drift out of sync the way two separately-guessed pixel values would.
- **Don't force a layout recalculation every animation frame.** Reading (`getBoundingClientRect()`) every frame is fine; *writing* layout-affecting styles (padding, size) every frame causes real layout thrashing. Do expensive layout writes once, on resize/init (see `sizeGame()` vs the per-frame `updateAnchor()` split in `techno-hero.js`).
- **A sizing/responsive fix isn't done until it's been screenshotted**, not reasoned about from the CSS alone — see the QA checklist.

## Unified metallic shine effect ("gz-shine")

There is exactly one metallic shine/flash effect on this site — the `.mile.tier-diamond::after, .host-card.tier-diamond::after, .btn::after` rule block in `assets/css/style.css` (search "Unified metallic shine"), driven by the `gz-shine` keyframe. Do not write a new bespoke shine animation for a future component — extend that selector list to include the new element instead, so there's one cadence and one look site-wide. Spec: exactly one flash every 60s (no idle mid-cycle resting state — rest is `opacity:0`, not a parked-off-screen gradient), a crisp white sweep with minimal feather (no soft blur), plus two small fixed four-point sparkle glints that twinkle on with the flash. Keep sparkle `background-position` placement near a component's corners/margins, not its center — the center is usually where the real text sits.

This is a specific case of a broader rule: **before adding any new visual/interactive effect, check whether an existing shared implementation already does the job.** One effect used everywhere beats five near-identical ones that quietly drift apart.

## Diamond tier "flare" system (Ambassador cards)

`assets/js/ambassador.js` has `pickDiamondFlare()` — a deterministic, rarity-weighted picker for the Diamond-tier color variants defined in `assets/css/style.css` (`[data-flare="..."]` rules on `.host-card.tier-diamond`). It is not wired to anything live; the current example cards have `data-flare` set by hand. When the Ambassador event-log backend (roadmap #1 in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md`) exists and can identify who has actually reached Diamond, call this picker with a stable per-ambassador id to assign their flare — do not hand-assign flares to real ambassadors, and never use `crimson` more often than its 1% weight implies.

## Testing interactive features (hero mini-game, calendar, and anything like it)

Checking for the absence of console errors is not the same as verifying a game or interactive widget actually feels functional, and isn't sufficient on its own. When testing anything playable or operable (the hero mini-game in `assets/js/techno-hero.js`, the Plan-Your-Visit calendar in `assets/js/calendar.js`, or any future one), actually drive it: simulate the real input sequence (keydown/keyup over time, not just a single dispatched event, or held-key movement, not a single tap), let it run for several real seconds, and confirm the loop/interaction behaves as intended — the shape moves the expected amount, collisions/scoring fire, focus moves to the right element, nothing freezes or drifts — rather than only confirming it initializes without throwing.

## Keyboard accessibility

Any custom interactive widget (not a plain link/button, which get this for free) needs to actually be operable without a mouse — this was a real gap on the calendar (`.cal-cell`) until 2026-08-26: click/hover only, no way to even Tab to a day. Going forward:

- Every custom interactive element needs a sensible `tabindex`, `role`, and `aria-label`/`aria-labelledby`.
- Grid/list widgets use a **roving tabindex** (exactly one item is a Tab stop at a time — the currently-relevant or last-interacted one) rather than making every single item individually tab-stoppable, which turns a 30-cell calendar into a 30-tab slog.
- Arrow keys navigate within a grid/list the way a user would expect (Left/Right = adjacent item, Up/Down = a row/week away where that makes sense); Enter/Space activates, matching native button behavior.
- A visible focus ring (`:focus-visible`, not a bare browser default that may be invisible against a dark theme) is required on anything focusable — check it's actually visible against this site's dark backgrounds, not just present in the CSS.

## No fabrication of facts

Never invent a specific date, statistic, quote, or capability that isn't confirmed real, even to fill an awkward content gap. If the real answer is "we don't have that yet" (a next-cohort date, a live data pipeline, admin-portal access), say so honestly and offer a real, working alternative instead — a waitlist/contact link, an honest "not yet scheduled," a roadmap note — rather than a plausible-looking placeholder that could get mistaken for real information later. This applies to marketing copy, example data, and roadmap claims alike.

## Soft goals: wowed, seen, and accepted

The hard rules above (readability, sizing, keyboard access) are the floor — a change can pass every one of them and still feel cold, generic, or unwelcoming. This site's actual job is emotional as much as functional: a visitor should come away feeling **wowed** (this place has real production value and energy), **seen** (this speaks to someone like *me*, specifically), and **accepted** (I'm genuinely invited in, not just tolerated). Treat these as design requirements, not polish — the same way a missing focus ring is a bug, a page that makes a first-timer feel like an outsider is a bug.

**Wowed** — production value and a little delight, without needing to say a word about it:
- The gamified layer (the tier ladder, the Diamond shine, the hero mini-game, the morphing background) is the site's main "wow" lever — keep it sharp (see "Unified shine" and "Container & sizing" above) rather than letting it decay into something merely functional.
- Real photography and real specifics beat generic stock-feeling content every time — the Past Events photo waterfall, named ambassadors with real socials/games, and the real (not simulated) SENET All-Time numbers on Games all do this. When adding new content, default to something specific and real over something generic and safe.
- A flourish only lands if it doesn't fight the content — see the crosshatch texture's whole arc (2026-08-25 → removed 2026-08-26): a "wow" effect that makes people squint is a net loss, not a wash.

**Seen** — different visitors should each find themselves reflected somewhere on the site, not just one generic pitch:
- The Ambassador pillars (Content Creator / Esports Team / Community Organizer / Organization) and the two distinct org examples exist specifically so a solo streamer, a competitive team, and a club officer each see themselves as the intended audience, not just "influencers." Keep expanding this kind of range rather than defaulting back to one archetype.
- The simulated personas in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` Part 3 (Jaden, Priya, Marcus, Devonte, Grace, Alex) are the standing reference for "who might land on this page and what do they need to see" — a new page or section should be able to name which of them it's speaking to, and ideally more than one.
- Honest, current copy is part of feeling seen too — a stale "Closed" with no next step reads as "we forgot about you," not just "incomplete info." See "No fabrication of facts" above for the honest way to handle a real gap.

**Accepted** — remove friction and doubt about whether someone is genuinely welcome, and make the space feel lived-in and active:
- Say the welcoming thing explicitly, don't assume it's implied — "Walk-ins always welcome, no purchase or account required," the under-18-with-guardian note, and "always Free to Get in the Zone" are all deliberately spelled out rather than left for a visitor to infer or worry about.
- Watch for gatekeeping language or visuals — gaming-culture shorthand can unintentionally read as "you already need to be one of us" to a first-timer (Grace's persona) or a parent (Priya's). When gamer jargon is used, make sure the plain-English meaning is never more than a glance away.
- "Accepted" scales into "this is a living community, not a static brochure" — that's the whole point of the roadmap's "Live at the Zone" hub concept (`docs/08-USABILITY-AUDIT-AND-ROADMAP.md` Part 4 #2): a community leaderboard, a "who's here today" pulse, an async trail mosaic — small, real signals of other people being here, not just copy claiming a community exists. Per `docs/01-PRD.md` §5, deep real-time social interaction is intentionally Discord's job, not the static site's — the site's role is to make that liveness *visible and inviting* enough that someone wants to go be part of it, not to rebuild Discord itself.

## Long-term direction: keep pushing the roadmap forward

`docs/08-USABILITY-AUDIT-AND-ROADMAP.md`'s Part 4 (Roadmap) is the standing list of where this site is headed next, in priority order — it is not a one-off deliverable, it's meant to be read and advanced in every session that touches related territory. Concretely:

- Before starting unrelated work, skim the roadmap section for anything the current task naturally touches or unblocks, and take the opportunity to nudge it forward even in a small way.
- When a roadmap item ships (fully or partially), update its entry in the doc rather than leaving it stale — mark what's done, what's still open.
- When a new long-term idea comes up in conversation (the "Live at the Zone" hub concept is the template for this), write it into the roadmap doc with real reasoning, not just a one-line chat mention that gets lost once the conversation scrolls away.
- Every session's work should leave the roadmap doc as an accurate reflection of current reality, not a snapshot of whenever it was last touched.

---

## QA & self-review workflow

Run this before considering **any** visual, layout, or interactive change finished — and run it again as a final pass before pushing to `main`. Don't rely on memory of having done it earlier in a long session; re-check against the actual current state of the files.

**1. Rule compliance pass.** Re-read the "Core rules" list above against the actual diff. For each rule that could plausibly apply to what changed, explicitly confirm it — don't just assume a rule wasn't relevant because the task description didn't mention it.

**2. Readability check.** For anything touching text-over-background, decorative effects, or color: check contrast at rest AND at any animated effect's most intense moment (force the effect to that state and screenshot it — don't eyeball from the CSS values). Target WCAG AA (4.5:1 normal text, 3:1 large text/UI elements).

**3. Container/sizing check.** For anything touching layout, sizing, or responsive behavior: screenshot at mobile (~390–400px), tablet (~768–820px), and desktop (~1280–1400px+). Check for clipping, overflow, and content that's too long/short for the new layout — not just the example content used while building it.

**4. Interactive/functional check.** For anything touching a game, form, calendar, or other widget: actually operate it via simulated real input (held keys, sequences over multiple seconds, keyboard-only operation) and confirm the *behavior*, not just the absence of thrown errors. Check the browser console for errors and warnings regardless (excluding known-harmless `file://` CORS noise during local testing).

**5. Cross-page smoke test.** Before pushing to `main`, load every page that could plausibly be affected (when in doubt, all of them: `index.html`, `events.html`, `games.html`, `ambassador.html`, `edu.html`) and confirm no new console errors.

**6. Roadmap alignment check.** Did this session's work touch anything on the Part 4 roadmap? If so, update that entry. Did anything come up that should become a new roadmap item? Write it in, don't leave it only in chat.

**7. Soft-goals gut-check.** Reread the actual change as if you were one or more of the personas in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` Part 3 — would this specific persona come away feeling more wowed, seen, or accepted, or is it neutral-to-worse for them? For any new visitor-facing page or section, name which persona(s) it's speaking to; if you can't name one, that's a sign the content is too generic. For any new gamified/flourish element, confirm it doesn't come at the cost of clarity for someone unfamiliar with gaming shorthand. This check should point to something concrete and checkable (a specific line added, a specific example diversified) — not just a feeling.

**8. Documentation check.** If this session established a new standing rule (not just a one-off fix), add it to this file *in the same session* — a rule that only exists in a chat transcript doesn't survive to the next session.

**9. Git hygiene before pushing.** `git status`/`git diff` review of everything staged — confirm nothing unintended is included, commit messages describe the actual change (not just "fixes"), and `git fetch`/rebase against `origin/main` before pushing in case anything else landed there since the session started (an automated `chore:` commit landing mid-session is a real, observed case here). Anything genuinely uncertain gets flagged to Eric rather than pushed silently.
