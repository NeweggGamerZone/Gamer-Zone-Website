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
6. **Every section shares one container-width system, not an ad hoc size per component.** No section shrink-wraps tight to its own content while a sibling stretches full-width nearby — width comes from the shared `.container`/`--safe-x` system, content reflows inside it. See "One shared container width" below.
7. **Never call an interactive feature (game, widget) done from the absence of console errors alone.** Actually drive it with simulated input over real time. See "Testing interactive features" below.
8. **Every new interactive element is keyboard-operable**: reachable via Tab, has a visible focus state, and supports the input pattern users expect (Enter/Space to activate, arrow keys for grid/list navigation). See "Keyboard accessibility" below.
9. **Every visitor-facing change should make someone feel more wowed, seen, or accepted — never less.** These are real design goals, not vibes. See "Soft goals" below, and run the gut-check in the QA workflow.
10. **In any card grid, a title's line count must never shift where the content below it starts.** A one-line title and a two-line title, sitting side by side, must still line up on the row beneath them. See "Card row alignment" below.
11. **No feature or change is "done" until it has been explicitly checked against every rule above.** Run the QA checklist at the end of this file before considering any change finished, and again before pushing to `main` — treat this file as an active checklist to execute, not background reading.
12. **Run the pixel-verified WCAG AAA contrast audit on every passover — every content update and every page change, not only layout/visual work.** A manual/grep-based color check is not sufficient; it already missed a real failure (`.reg-step-num` white-on-orange) that only surfaced because Eric caught it by eye. See "Readability" below for the exact method and how to run it.
13. **A QA loop pass only ever reports findings — it never fixes anything on its own.** When Eric asks for a QA loop run, run the scripted checks (`tools/audit/run-full-qa.sh`) plus the manual persona/soft-goals/interactive review, compile everything into one findings summary, and stop. Only implement whatever Eric explicitly says to act on. See `docs/QA-RUNBOOK.md` for the full loop.

---

## Text overflow in small card grids: no ellipsis

Applies to small, fixed-cardinality card grids — Featured Ambassadors, About Gamer Zone side cards, Visit/About/Preregister cards, and anything of that shape added later. Does **not** apply to long, dense list layouts (e.g. the Games catalog list), where a rare-case ellipsis + hover/tap popup fallback is the correct tradeoff — see `assets/css/style.css`'s `.game-list li .gl-name` comment for why that context is different.

In a card grid:

- Never truncate text with `text-overflow: ellipsis` or `-webkit-line-clamp` to force a card to a fixed height. If content is too long, let it wrap to as many lines as it needs.
- Rely on CSS Grid's default `align-items: stretch` (do not override it) so every card in a row auto-matches whichever card is currently tallest. One long name making one card taller makes the *whole row* a little taller, evenly — it should never look like a cut-off card sitting next to clean ones.
- Prefer shortening the actual copy first if something is unreasonably long (e.g. an example organization name), but the layout itself must never depend on clipping to look tidy — it has to hold up even if the copy can't be shortened.

`.host-card` in `assets/css/style.css` is the reference implementation.

## Card row alignment: reserve the title's max height, don't let it float

A related but distinct problem from the one above: even once a card grid's *row* height is correctly stretching to match its tallest card (rule 1), the *content inside* each card can still misalign — if one card's title wraps to two lines and its neighbor's title fits on one, the neighbor's body copy/email/paragraph starts a full line higher than the wrapped card's does. Every card in that row reads as slightly "off" against its neighbors even though no single card looks broken on its own — this is what Eric flagged 2026-08-26 looking at the registration steps and Featured Ambassador cards.

There isn't one universal industry-standard name for this exact pattern, but it's closest to what CSS's `subgrid` feature was built to solve (aligning a repeated internal row-structure — title row, body row, footer row — across sibling grid items so they share the same row lines, the way a spreadsheet's rows line up across columns). `subgrid` is the "true" fix and has solid modern browser support, but it also means restructuring every affected grid into a two-level `display:grid` (outer grid defines the row template, each card opts into `grid-template-rows:subgrid`) — a bigger, more fragile change than this project's existing patterns call for.

**This project's fix instead: reserve the title's own maximum height as a floor, the same `min-height` philosophy rule 1 and the container/sizing rules already use everywhere else.** `.card h3` in `assets/css/style.css` sets `min-height: 3.2em` — two lines' worth of height at this project's inherited 1.6 line-height — so every card's title *zone* is the same height regardless of whether that specific title actually needs one line or two. A short title just top-aligns within its reserved zone and leaves its own natural blank space below it (exactly the space a real second line would have occupied); a long title fills the zone for real. Either way, whatever comes after the title — an email, a paragraph, a category line — starts at the exact same Y position across every card in that row. Applied once at the shared `.card h3` level (not per-component) so every current and future `.card` grid gets it automatically, the same "one shared implementation" principle as `gz-shine`.

**When this applies:** any grid of sibling cards where a title's real-world length varies card to card (a person's name, an event title, a program name) and something else sits directly below it. **When it doesn't:** a single standalone card with no siblings to align against (nothing to gain from reserving space), or a title that's fixed, short copy unlikely to ever wrap (harmless either way, but not the point of the rule).

## Readability: WCAG-grade contrast, always, including mid-animation

No decorative texture, glow, shine, or background effect ships (or stays shipped) at a strength that makes text harder to read. This isn't a vibe check — hold it to a real bar:

- **Target WCAG 2.1 AAA contrast**: at least 7:1 for normal text, 4.5:1 for large text (≥24px, or ≥19px bold), against whatever is actually behind them — including a decorative effect's *brightest* moment, not just its resting state. A brief animated flash that drops a text region below that ratio for even part of its cycle is a real bug, not an acceptable trade for "it's only for a second." (Raised from AA's 4.5:1/3:1 on 2026-08-26, per Eric's call — see the site-wide color audit in the roadmap doc's changelog for what that meant in practice.)
- **Non-text UI/graphical elements** (icons, borders, focus rings, chart slices) don't have a WCAG AAA criterion — 1.4.11's 3:1 minimum is an AA-only success criterion with no stricter AAA tier defined. Hold these to that same 3:1 floor, but prefer 4.5:1 where it's easy to hit without a real design cost, so the site doesn't have an odd cliff between "text next to an icon" and "the icon itself."
- **Z-index every layer explicitly.** Any element that layers a decorative background behind real text must keep every text/interactive child at a higher `z-index` than the effect — check this explicitly, don't assume default stacking gets it right. The 2026-08-25 "grids make the text unreadable" bug happened because `.mile`'s content (`.unlock`, `ul`, `.mile-count`, `.rank-badge`) had no `z-index` at all, so the shine painted on top of it.
- **Keep decorative opacity low enough to read as flavor, not as a competing pattern.** If a texture reads as "a grid," "noise," or any other recognizable pattern in its own right rather than a subtle surface finish, it's too strong — this project's tier crosshatch texture went through two rounds of opacity cuts before being removed outright on 2026-08-26 because it never stopped competing with the card's own text. When a texture keeps needing readability rescue passes, the right fix is often to cut it, not tune it further.
- **Check this on every visual/design pass**, the same way the no-ellipsis rule gets checked — don't just check "does the effect look cool," check "is every line of text on this component still comfortably legible with the effect running," at rest AND at its most visually intense moment.

### Mandatory: run the pixel-verified contrast audit on every passover

A grep/manual review of CSS color declarations is **not sufficient** — it already missed a real, live failure (`.reg-step-num` white text on the orange gradient background, only caught because Eric spotted it by eye on 2026-08-26). Checking named CSS variables in isolation doesn't tell you which components actually combine them, or what a gradient/photo-overlay/opacity stack renders as at runtime.

The reliable method (built 2026-08-26, reusable every session) actually walks the live DOM and samples real rendered pixels rather than reasoning about CSS values on paper:

1. **Enumerate every real text node** via `document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, ...)`, skipping hidden/zero-opacity nodes, and record each node's computed `color`, `fontSize`, `fontWeight`, plus its precise glyph rect from `Range.getClientRects()` (more accurate than the parent element's box).
2. **Screenshot the page twice**: once normally, and once with a temporary stylesheet forcing `* { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }` — this isolates the true rendered background (gradients, photo overlays, decorative effects, opacity stacking) with the text removed.
3. **Sample the background-only screenshot** at each text node's position (small median-based pixel window, to dodge anti-aliasing noise) to get the actual effective background color that piece of text sits on.
4. **Compute the real WCAG contrast ratio** (relative luminance formula, implemented directly — `srgb_to_linear` → `relative_luminance` → contrast ratio) between the text's computed color and the sampled background, and check it against 7:1 (normal text) or 4.5:1 (large text: ≥24px, or ≥18.66px bold).
5. Run this across **all 5 pages** (`index.html`, `events.html`, `games.html`, `edu.html`, `ambassador.html`), including a full scroll-through first so scroll-triggered `.reveal` fade-ins are actually visible when the DOM is walked.

**This tool is checked into the repo at `tools/audit/`** (`collect.js` + `analyze.py`, plus `setup.sh`/`run.sh`/`README.md`) — run `bash tools/audit/setup.sh` once per fresh environment, then `bash tools/audit/run.sh` for the full audit. It used to live only as ephemeral `/tmp` scratch work rebuilt from a text description every session; that was fragile enough (and burned enough real session time re-deriving it) that it was promoted to a real, versioned part of the repo on 2026-08-26. If a future session finds a real bug in the tool itself, fix it in `tools/audit/` and note the fix in its own history, the same as any other code in this repo — don't fork a new copy in `/tmp`.

**Non-text UI elements** (borders, focus rings, button shapes, icons, chart slices) aren't covered by the text-node walk above — check those separately against the 3:1 AA floor (see the "Non-text UI/graphical elements" bullet above) whenever a session touches them.

**Do this on every content update and every page change** — not only dedicated "color audit" or visual-redesign sessions. A copy edit, a new section, a new card, or a background swap can just as easily introduce a real contrast failure as a deliberate color-system change can.

## Container & sizing discipline

Lessons paid for the hard way this project (the Weekly Lineup mobile-clipping bug, the hero-game sizing miss) — don't re-learn these:

- **`aspect-ratio` on a plain block element is a forced size, not a floor.** Unlike a flex/grid *item*, a plain block gets no automatic content-based minimum size — combined with `overflow:hidden`, content taller than the ratio-derived height gets silently clipped instead of the box growing. If a component's content length is unpredictable (event lists, user-generated text, etc.), use `min-height` (a genuine floor that still lets the box grow for real content) instead of `aspect-ratio` to approximate a square/ratio look.
- **When one component's size depends on another's, tie them together with shared math, not two independently hand-tuned numbers.** The hero game's ground shape is deliberately computed from the exact same `A` constant that scales the decorative background rings (`assets/js/techno-hero.js`), so they can't silently drift out of sync the way two separately-guessed pixel values would.
- **Don't force a layout recalculation every animation frame.** Reading (`getBoundingClientRect()`) every frame is fine; *writing* layout-affecting styles (padding, size) every frame causes real layout thrashing. Do expensive layout writes once, on resize/init (see `sizeGame()` vs the per-frame `updateAnchor()` split in `techno-hero.js`).
- **A sizing/responsive fix isn't done until it's been screenshotted**, not reasoned about from the CSS alone — see the QA checklist.

### One shared container width, not a per-section patchwork

This site has exactly one horizontal-rhythm system: `.container` (`max-width:1140px`) plus the shared `--safe-x` side-padding variable (`clamp(1rem, 4vw, 2.2rem)`), both defined once near the top of `style.css`. Every normal page section should sit inside that same container and share that same edge padding — not because 1140px is sacred, but because a page where every section independently decided its own width reads as visually unstable: one card grid shrink-wrapped tight around its content, a section next to it stretching edge-to-edge, another sitting at some third random width. That patchwork is the actual failure mode to avoid, not any specific pixel value.

- **New sections/components inherit `.container`/`--safe-x` by default.** Only break out of it with a real, specific reason (a full-bleed background image, a board-mode export capture, a decorative canvas layer) — and when you do, say why in a comment, the way `.eu-board`'s `--eu-safe-x` (a deliberate 10%-wider variant, still derived from the shared `--safe-x`) documents its own reasoning rather than inventing an unrelated number.
- **Don't let a container's width react to its own content length.** A card grid, board, or panel should hold a stable width (from the shared system above) and let *content* reflow inside it — wrap text, grow height, add rows — rather than the *container* shrinking to fit whatever's in it today and ballooning tomorrow when the copy changes. A component that resizes itself around its content is the same root mistake as the no-ellipsis and `aspect-ratio`-as-forced-height rules above, just at the section level instead of the card level: don't let content length dictate a hard container dimension.
- **When a new component needs its own internal width/type scale** (the way `.eu-board` scales its own text against its own width via `container-type: inline-size` and `cqw` units instead of the viewport), that's fine — it's still anchored to the shared outer container's width, just adding its own internal responsiveness on top, not replacing the outer system with an unrelated one.
- **The Past Events photo waterfall (`.photo-waterfall` on `events.html`) is the reference implementation** for "a section that genuinely uses its section's full width" — no `max-width` of its own, a real multi-column grid instead of one narrow centered element, checked and confirmed against every other section's edges in the 2026-08-26 site-wide audit (see the roadmap doc's changelog). When in doubt about whether a new section is "full width enough," compare it against this one rather than eyeballing it in isolation.
- **A section with genuinely unique functionality earns its own unique full-width technique — not a literal edge-to-edge stretch of its existing layout.** A single centered carousel card (`.zone-stack` in "About Gamer Zone") technically already spans `width:100%` of its section, but still *reads* narrow because only one card's worth of content is visible at a time — stretching the carousel track itself wouldn't fix that, since the card itself needs to stay a fixed, legible size. The right fix for a component like this is adding more of the component's *own* visual language at the edges (e.g. genuine flanking peek-cards, not decorative filler) so the section reads as full-width in substance, not just in its outer CSS box. Don't accept "the wrapper div is 100% wide" as proof a section passes this rule — check whether it *reads* as using its width, the same distinction the readability rule draws between "opacity is technically above 0" and "actually legible."
- **Audit this on every visual pass**, same as readability: does this page, read top to bottom, feel like one consistent column width with consistent breathing room on both sides — or does it feel like sections were each designed in isolation? A full DOM-measurement + full-page-screenshot audit across all 5 pages (2026-08-26) found the section-wrapper system already consistent site-wide, with exactly one documented exception (`.hero-stage`'s full-bleed hero) — see the roadmap doc for the full method and findings if repeating this audit later.

## Unified metallic shine effect ("gz-shine")

There is exactly one metallic shine/flash effect on this site — the `.mile.tier-diamond::after, .host-card.tier-diamond::after, .btn::after` rule block in `assets/css/style.css` (search "Unified metallic shine"), driven by the `gz-shine` keyframe. Do not write a new bespoke shine animation for a future component — extend that selector list to include the new element instead, so there's one cadence and one look site-wide. Spec: exactly one flash every 60s (no idle mid-cycle resting state — rest is `opacity:0`, not a parked-off-screen gradient), a crisp white sweep with minimal feather (no soft blur), plus two small fixed four-point sparkle glints that twinkle on with the flash. Keep sparkle `background-position` placement near a component's corners/margins, not its center — the center is usually where the real text sits.

This is a specific case of a broader rule: **before adding any new visual/interactive effect, check whether an existing shared implementation already does the job.** One effect used everywhere beats five near-identical ones that quietly drift apart.

## Shared infinite marquee ("gz-marquee")

A second shared implementation under that same broader rule, added 2026-08-26 for the Pinterest/"loved by"-style redesign of the Past Events photo waterfall and the Reviews waterfall: `GZ.marquee(container, items, opts)` in `assets/js/main.js` + `.gz-marquee`/`.gz-marquee-track` in `style.css` (search "Shared infinite marquee"). It builds a continuously-scrolling, fixed-height horizontal lane (duplicated content, `translateX(-50%)` loop, edge-fade mask, pause on hover/focus-within, real reduced-motion fallback that renders the un-duplicated set statically instead of freezing mid-loop). Reuse this — don't hand-roll a new marquee — for any future "many items scrolling past" component. It's a deliberate middle path between two failure modes already hit once each on this project: a static always-visible grid reads as having "no motion" (the reason the original photo masonry was retired the same day it shipped), while a *vertically* stacked/cycling layout with variable-length content visibly grows and shrinks the section over time (the reason the reviews section was pulled back from a multi-card layout to a single spotlight card). A single-row horizontal marquee gets real motion without either problem, since its own height never changes regardless of which items are currently scrolling through it.

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

This is the *execute-and-verify* half of the process — it runs after a change is implemented, as part of getting that one change ready to ship. It's distinct from a **QA loop pass** (`docs/QA-RUNBOOK.md`, core rule 13): a standalone, on-demand review across the whole site that only ever reports findings for Eric to approve before anything gets changed. Steps 2, 3, and 5 below are largely automated now — `bash tools/audit/run-full-qa.sh` runs the contrast audit, container-width check, and cross-page console smoke test in one pass (see `tools/audit/README.md`).

**1. Rule compliance pass.** Re-read the "Core rules" list above against the actual diff. For each rule that could plausibly apply to what changed, explicitly confirm it — don't just assume a rule wasn't relevant because the task description didn't mention it.

**2. Readability check — mandatory on every content update and page change, not just visual passes.** Run the full pixel-verified contrast audit (see "Mandatory: run the pixel-verified contrast audit on every passover" under "Readability" above) — real DOM text-node walk + rendered-pixel background sampling, not a CSS-value read-through. Check contrast at rest AND at any animated effect's most intense moment (force the effect to that state and screenshot it). Target WCAG AAA (7:1 normal text, 4.5:1 large text; 3:1 for non-text UI elements, which have no AAA tier). A grep-based check already missed a real failure once (`.reg-step-num`) — treat that as proof this step can't be skipped or shortcut.

**3. Container/sizing check.** For anything touching layout, sizing, or responsive behavior: screenshot at mobile (~390–400px), tablet (~768–820px), and desktop (~1280–1400px+). Check for clipping, overflow, and content that's too long/short for the new layout — not just the example content used while building it. Also check it against the page around it: does the new/changed section's width and side padding match the shared `.container`/`--safe-x` system, or did it quietly invent its own — either shrink-wrapped tight to its content or stretched wider than everything else on the page?

**4. Interactive/functional check.** For anything touching a game, form, calendar, or other widget: actually operate it via simulated real input (held keys, sequences over multiple seconds, keyboard-only operation) and confirm the *behavior*, not just the absence of thrown errors. Check the browser console for errors and warnings regardless (excluding known-harmless `file://` CORS noise during local testing).

**5. Cross-page smoke test.** Before pushing to `main`, load every page that could plausibly be affected (when in doubt, all of them: `index.html`, `events.html`, `games.html`, `ambassador.html`, `edu.html`) and confirm no new console errors — `node tools/audit/console-check.js` (or the full `run-full-qa.sh`) automates this.

**6. Roadmap alignment check.** Did this session's work touch anything on the Part 4 roadmap? If so, update that entry. Did anything come up that should become a new roadmap item? Write it in, don't leave it only in chat.

**7. Soft-goals gut-check.** Reread the actual change as if you were one or more of the personas in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` Part 3 — would this specific persona come away feeling more wowed, seen, or accepted, or is it neutral-to-worse for them? For any new visitor-facing page or section, name which persona(s) it's speaking to; if you can't name one, that's a sign the content is too generic. For any new gamified/flourish element, confirm it doesn't come at the cost of clarity for someone unfamiliar with gaming shorthand. This check should point to something concrete and checkable (a specific line added, a specific example diversified) — not just a feeling.

**8. Documentation check.** If this session established a new standing rule (not just a one-off fix), add it to this file *in the same session* — a rule that only exists in a chat transcript doesn't survive to the next session.

**9. Git hygiene before pushing.** `git status`/`git diff` review of everything staged — confirm nothing unintended is included, commit messages describe the actual change (not just "fixes"), and `git fetch`/rebase against `origin/main` before pushing in case anything else landed there since the session started (an automated `chore:` commit landing mid-session is a real, observed case here). Anything genuinely uncertain gets flagged to Eric rather than pushed silently.
