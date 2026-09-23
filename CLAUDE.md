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
14. **The QA loop terminates every time — it never chains into another round on its own.** Finishing a fix-and-verify cycle is not license to go find more things and start over unprompted, even when Eric's own phrasing implies continuation ("see what else you notice," "keep digging") — treat that as "one more focused pass, then check in again," not standing permission to iterate indefinitely. Every complete cycle ends with a check-in that includes real clarifying questions (what's still open, what needs a call only he can make), not just a status recap. See `docs/QA-RUNBOOK.md`'s "The loop terminates every time" section.
15. **Any open-ended issue is proposed before it's implemented.** Settled 2026-09-08, per Eric: when something needs to be *diagnosed or designed* — an audit finding (an F-item), a bug with more than one plausible fix, a design/content question with real tradeoffs ("is there a better shape for X") — state the issue and a concrete proposed solution, then stop and wait for Eric's explicit go-ahead before touching any file. Don't implement-then-report for these. This is distinct from rule 13's QA-loop-specific report-only mode: it applies any time, not just during a QA loop, to anything open-ended enough to have more than one reasonable answer. It does **not** apply to a direct, fully-specified instruction ("remove the word 'with' from X," "change this button's color to orange") — those still get implemented directly, the same as always; asking "how would you like me to phrase this exact edit" would be busywork, not caution. When genuinely unsure which bucket a request falls in, treat it as needing a proposal first — asking costs little, implementing the wrong thing costs a revert.

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

### A known false-positive category: elements gated by a load/scroll-triggered CSS transition

Found and triaged 2026-09-15. The audit flagged two failures in the same session --
`nav.main-nav a.active` on `games.html` (1.04:1, black text on a sampled near-black bg) and
`.zone-card-code` ("ZONE 1") on `index.html` (also 1.04:1, same near-black sample) -- on
elements neither one touched that session. Both turned out to be false positives from the
exact same underlying cause, confirmed by direct pixel sampling and the real WCAG luminance
math, not just re-reading the CSS: `.nav-pill` (the element actually behind the active nav
link's black text) starts at `opacity:0` and only reaches `opacity:1` via a `requestAnimationFrame`-gated
`.settle-in` class added right after its initial position is set (`initNavPill()` in
`main.js`); `.zone-card-code`'s own card is subject to the Zone Stack carousel's own
positioning transition. In both cases, a screenshot taken before that transition has actually
finished settling samples the *pre-transition* (still invisible / still-near-black) state
instead of the real, settled one -- even though `collect.js` does a full scroll-through first
specifically to trigger scroll-based `.reveal` fades, that scroll-through doesn't guarantee
every *load-triggered* or *carousel-internal* transition has also finished by the time its
screenshot pass runs. Real contrast at rest, confirmed both by computing WCAG relative
luminance from the actual CSS colors and by sampling real rendered pixels after a full
settle: the nav pill's orange (sampled `rgb(237,140,19)`, a point partway through its
gradient) against black text is **8.37:1**; `.zone-card-code`'s flat `var(--ne-orange)`
(`rgb(250,157,40)`) against black text is **9.91:1** -- both comfortably clear of the 7:1 AAA
floor, and both elements predate whatever session is currently running (nav-pill: 2026-09-10;
zone-card-code: the original Zone Stack build). **When a fresh audit run flags a decorative
orange badge/pill that sits behind a `position:absolute` or transitioning element, don't
assume it's a real regression from the current session's work** -- re-check with a settled
(1-2s post-transition), correctly-scrolled pixel sample (see this section's own repro method)
before treating it as a real bug to fix. This is a real, disclosed limitation of `collect.js`
itself, not a fix -- a future session could harden the tool (e.g. wait for a second
`requestAnimationFrame` plus a fixed settle delay before the "text hidden" screenshot pass,
or force `transition:none` globally during the audit run) but that's an open design question
with more than one reasonable approach, so it hasn't been done without Eric's go-ahead per
core rule 15 -- this note exists so the *known* false positives aren't re-investigated from
scratch next time, not as a substitute for actually fixing the tool.

**A second, differently-caused false-positive category, found 2026-09-16:** `collect.js` also
doesn't scroll horizontal-overflow containers into view before its background-sampling pass --
a real card laid out past a horizontally-scrollable container's initially-visible width never
actually gets painted in a full-page screenshot (browsers don't render content past a
scrollport's visible area, unlike the vertical case `collect.js` already handles via its
full-scroll-through step), so its background samples as blank page background instead of its
real style. First hit by the Featured Gear carousel's "View on Newegg" buttons -- see "Seven
direct fixes" below for the full repro/verification. Same handling as the category above: don't
assume a flagged element in a horizontally-scrollable section is a real regression without
re-checking against its real computed style after actually scrolling it into view first.

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

## Weekly Lineup masthead: one combined line, and a nested-flex overflow gotcha

Added 2026-09-03 at Eric's request: the masthead on `#week .eu-board` used
to be two separate elements — `#eu-eyebrow-title` (the date range, e.g.
"SEP 1 - 5") on the left and a since-removed `.eu-theme-dates` span
("WEEKLY THEME: RIOT GAMES WEEK") right-aligned across the row. It's now a
single left-aligned line built entirely in `#eu-eyebrow-title`
(`assets/js/event-update.js`, the `eyebrowTitleEl` block) — e.g.
"SEP 1 - 5: RIOT GAMES WEEK" — sized off `var(--eu-date-size)`, the same
token the Special Events rows below use for their own date text, instead
of its own independent clamp. That was the point of the request: the
masthead and the rows now always match in size and stay left-aligned in
lockstep at every breakpoint, rather than risking drift between two
independently-sized, independently-aligned elements. `.eu-theme-dates`
and its `#eu-eyebrow-dates` element are gone entirely (removed from
`index.html`, `events.html`, and `style.css`) — nothing else referenced
them.

**Overflow gotcha found while testing this with a deliberately long theme
name:** a long combined line (e.g. "SEP 1 - 5: FIGHTING GAMES COMMUNITY
CHAMPIONSHIP WEEK") was rendering ~25px wider than `#week .eu-board`'s own
content box at a 400px viewport and getting silently clipped by the
board's `overflow:hidden` — a real rule-#1 violation, not a hypothetical
one. Root cause: `.eu-eyebrow` → `.eu-eyebrow-textcol` → `.eu-eyebrow-
titlerow` → `#eu-eyebrow-title` is a chain of nested flex containers, and
a flex item's computed box can end up wider than its own flex container
when a descendant several levels down doesn't have an explicit width —
`min-width:0` on the immediate flex item alone isn't sufficient once
there's more than one level of nesting between the sized container and
the actual text. Fixed by adding `width:100%` down the whole chain
(`.eu-eyebrow`, `.eu-eyebrow-textcol`, `.eu-eyebrow-titlerow`) plus
`min-width:0;max-width:100%;overflow-wrap:break-word` on
`#eu-eyebrow-title` itself, so it's now guaranteed to wrap (or, in the
extreme case of a single word wider than the column, break mid-word)
rather than ever overflow its container. Verified via Playwright at
400/640/900/1400px on both `index.html` and `events.html`, with the real
Sep 2026 data, an artificially long stress-test theme name, and confirmed
compatible with the `.eu-board-inner`/`--eu-scale` square-fitting
mechanism (`fitBoard()`) added the same week — the two fixes are
independent (one guards horizontal overflow inside the masthead, the
other guards vertical overflow of the whole board) and don't interact.
If a future masthead or eyebrow-style component nests flex containers
more than one level deep, don't assume `min-width:0` on the outermost
item is enough — check `scrollWidth` vs. the true container width at
every level, not just the one you touched.

## Weekly Lineup: single-line closures, top-aligned square, and the monthly-calendar drift bug

Added 2026-09-04 at Eric's request, after he caught the live board reading
"fully centered" instead of top-aligned, the Sep 5 Labor Day closure
splitting back into two lines, and `screenshot-monthly-calendar.html` no
longer matching the live page.

**Closures render as one line.** `row()` in `assets/js/event-update.js`
now gives closure-type events (`type: "closed"`, e.g. Sep 5) their own
early-return path: a single `.eu-name` line reading "SEP 5: Closed for
Labor Day" (class `eu-closure-line`, sized off `var(--eu-date-size)` in
`style.css`), instead of the two-column `.eu-date-wrap`/`.eu-info` split
every timed event still uses. `screenshot-monthly-calendar.html`'s hand-
authored Special Events list uses the identical markup/class for its own
Sep 5 row, so the two pages stay visually consistent even though one is
data-driven and the other is hand-authored.

**Why the live board read "centered" even after being told to top-align:**
two separate bugs stacked. First, `html:not(.board-mode) .eu-board`'s
`justify-content:center` (added 2026-08-26) was unscoped — it read bare
`.eu-board`, not `#week .eu-board` — so it also silently applied to
`screenshot-monthly-calendar.html`'s `#month` board. Fixed by scoping it
to `#week` and changing it to `flex-start`. Second, and less obviously:
`.eu-board-inner`'s `transform-origin` was `center center`. `fitBoard()`
(same file) shrinks `.eu-board-inner` via `transform:scale(var(--eu-scale))`
on any week whose content doesn't fit the forced 1:1 square — and scaling
from the center pulls the shrunk content back toward the middle of the
square, splitting the freed space evenly above and below it. That made
even a `justify-content:flex-start` board *read* as centered on any week
busy enough to trigger scaling, which is exactly what Eric was seeing.
Changed `transform-origin` to `top center` so the scale anchors at the
top instead — the shrunk content's top edge now stays flush against the
square's own top padding at every scale factor, and the freed space only
ever appears below the content. Verified via Playwright (`getBoundingClientRect`
on `.eu-board` vs `.eu-board-inner`, not just visual screenshots) that the
gap above the content equals the board's own padding at 400/640/900/1400px,
including on a week whose `--eu-scale` was measured at ~0.69.

**Why `screenshot-monthly-calendar.html` had drifted from the live page:**
two causes, not one. (1) An unrelated upstream commit (hero/gallery work)
substantially rewrote this file's template — new `.eu-week-row`/Special
Events structure — and during an earlier integration pass I diffed it for
`eu-eyebrow`/`eu-board`/events-data keyword overlap, saw none, and
wrongly concluded "no changes needed" without noticing the content itself
(Sep 5 closure, the two September renames) had been reset to stale
values by that rewrite. Keyword-matching a diff is not the same as
re-reading a file after its second rebase — for a hand-authored page with
no data-file source of truth, that's the only way to know it's still
accurate. (2) Independent of the content loss, the unscoped
`justify-content:center` bug above meant `#month`'s forced 1:1 square was
clipping real content: `event-update.js`'s very first line is
`const list = document.getElementById('eu-list'); if (!list) return;`,
and this file's rows are hand-authored (`class="eu-list"`, no
`id="eu-list"`) — so the entire script, including `fitBoard()`'s overflow
safety net, never ran here. The last two Special Events rows (Sep 26)
were completely invisible any time someone opened the file directly
instead of through the actual board-mode capture script. Both are fixed
now: content restored (Sep 5 closure, "Mario Kart World Tournament",
"Street Fighter 6 Saturday Slam" — reconciled directly against
`data/events.json`, the real source of truth, not the earlier stale
edit), and `#month` is no longer forced into any square outside
board-mode, matching the "intentionally differs" note already in this
file's own header comment.

**Lesson for next time:** when an upstream commit touches a file you've
hand-edited, re-read the full current file after every rebase/reset —
don't rely on a keyword-scoped diff to declare "no changes needed,"
especially for a page with no JSON/data source of truth to fall back on.
And when a CSS rule is meant to apply to one board (`#week` or `#month`)
specifically, scope the selector to that board's id explicitly — a bare
`.eu-board` rule silently reaches every board on the site, including ones
whose JS never runs to protect against it.

## Weekly Lineup: the live board dropped the forced 1:1 square (2026-09-09)

Supersedes this file's own "top-aligned square" framing above for the
**live homepage board specifically** — `#month`/`screenshot-monthly-
calendar.html` and the closure-line/monthly-drift lessons above are
unaffected. Per Eric: on a normal (1-2 event) week the forced square left
roughly half the box as dead black space below the content, right after
the hero's own high-energy scroll — the opposite of the "wowed" soft
goal. `html:not(.board-mode) #week .eu-board`'s `aspect-ratio:1/1` was
dropped entirely; the box now sizes to its own real content again (the
same min-height-as-floor-not-forced-height principle the container &
sizing rules above already use everywhere else), reading as a short,
dense horizontal banner on a normal week instead of a half-empty square.

**Why this was safe to do without touching `fitBoard()`:** that function
(`assets/js/event-update.js`) reads `board.clientHeight` vs
`inner.scrollHeight` generically — it has never cared whether
`clientHeight` came from a forced aspect-ratio or natural content flow,
so a genuinely busy week still gets exactly the same shrink-to-fit safety
net as before, unchanged. **Why this was safe re: the social exports:**
`scripts/capture-social-images.mjs`'s `board-mode` capture pipeline
computes its own height independently (its own `justify-content:center`
+ margin/padding overrides, all still scoped to `html.board-mode`) and
crops externally via `sharp` afterward — it was never reading this
element's live-page height in the first place, confirmed by tracing the
script before touching anything.

**The icon needed its own cap, separately.** The live page's `.eu-board-
icon img` sizing (`max-height:min(66cqw,540px)`) was tuned specifically
to fill a square's leftover space — once that space no longer exists,
the icon alone was still consuming ~500px and the box barely got shorter
at all after dropping the square. Capped down to `min(30cqw,200px)` for
the live board only (`html:not(.board-mode) #week .eu-board-icon img`),
roughly the same visual weight the icon already uses in the 16:9
social-export capture (`html.board-mode`'s own 340px cap) — kept as a
real decorative touch, not hidden outright, since a themed week's icon is
still a genuine "wow" flourish worth keeping in a compact banner.

**Real, disclosed tradeoff at mobile width:** desktop dropped from
~1124px tall to ~769px (32% shorter) and tablet from ~825px to ~634px —
both read as an intentional, dense banner now (verified via real
Puppeteer screenshots at 1400/800/390px, current live data, per core
rule 5). At 390px, height stayed roughly flat (~960-1055px either way)
because a long event title genuinely needs 3-4 wrapped lines at that
width regardless of box shape — that's a pre-existing font-size/wrapping
reality, not something this change created. The real difference at
mobile: before, that same wrapped content was being forced into a hard
358×358 square via `transform:scale()`, whose documented 0.55 floor
means a week needing more shrinkage than that gets its overflow
silently clipped by the square's `overflow:hidden` rather than shown —
a real, pre-existing risk for a content-heavy week at narrow widths.
Natural height removes that risk entirely (nothing to clip against) at
the cost of a longer mobile scroll on weeks with long titles. Re-verify
this specific tradeoff if a future week's content is unusually dense.

Re-ran the full pixel-verified contrast audit after this change: 727
text items across 5 pages, 0 failures.

## Sep 1-5 Riot Games Week uses the flag icon on a light week

`weeklyThemes[].icon` (`data/events.json`) already existed as a per-week
badge-art slot (e.g. the Fortnite crown). Sep 1-5 2026 is a light week —
just the Sep 5 Labor Day closure, no other special events — so it now
points at `assets/calendar/LineupAssets/us-flag-metallic.png` (moved
there from `assets/img/` to match where every other weekly icon asset
lives) so the square board has something to fill the space with instead
of empty room below the masthead and one closure row. Reused the existing
mechanism, not a new one — consistent with the "one shared implementation"
rule elsewhere in this file.


## Unified metallic shine effect ("gz-shine")

There is exactly one metallic shine/flash effect on this site — the `.mile.tier-diamond::after, .host-card.tier-diamond::after, .btn::after` rule block in `assets/css/style.css` (search "Unified metallic shine"), driven by the `gz-shine` keyframe. Do not write a new bespoke shine animation for a future component — extend that selector list to include the new element instead, so there's one cadence and one look site-wide. Current spec (as of 2026-09-16 — see that section below for the most recent change): exactly one flash every 60s (no idle mid-cycle resting state — rest is `opacity:0`, not a parked-off-screen gradient), a crisp white sweep with minimal feather (no soft blur) peaking at half-opacity (`0.5`, dimmed from a fully-opaque `1` per Eric's "make the shine effect less intense" call). The sparkle glints this paragraph used to describe were removed 2026-09-08 — see "Unified metallic shine" in `style.css` itself for that history; it's just the white sweep now.

This is a specific case of a broader rule: **before adding any new visual/interactive effect, check whether an existing shared implementation already does the job.** One effect used everywhere beats five near-identical ones that quietly drift apart.

## Unified button gradient

Settled 2026-09-09: every "primary orange" pressable element — `.btn`, `.pin-btn`, and `.reg-step-num`'s badge fill — uses the exact same `linear-gradient(145deg, var(--ne-orange), var(--ne-orange-deep))`, not a flat `var(--ne-orange)` fill or an independently-tuned gradient per component. This was a real fix, not a preemptive one: `.btn` previously used flat orange, `.pin-btn` already had the gradient, and `.reg-step-num` had its own separately-guessed dark stop (`#c96f10`) — three near-identical treatments that had drifted apart exactly the way "Unified metallic shine" above warns against. `.btn:hover`/`.pin-btn:hover` both use `filter: brightness(1.08)` rather than swapping to a second hardcoded hover color, for the same reason. Extend this same selector/gradient pair to any future primary-orange button rather than hand-picking a new one. Re-run the pixel-verified contrast audit (see "Mandatory: run the pixel-verified contrast audit on every passover" below) any time this gradient's stops change — the dark end sits close enough to the AAA floor for black text that a small shift could tip it under 7:1.

## Shared infinite marquee ("gz-marquee")

A second shared implementation under that same broader rule, added 2026-08-26 for the Pinterest/"loved by"-style redesign of the Past Events photo waterfall and the Reviews waterfall: `GZ.marquee(container, items, opts)` in `assets/js/main.js` + `.gz-marquee`/`.gz-marquee-track` in `style.css` (search "Shared infinite marquee"). It builds a continuously-scrolling, fixed-height horizontal lane (duplicated content, `translateX(-50%)` loop, edge-fade mask, real reduced-motion fallback that renders the un-duplicated set statically instead of freezing mid-loop). Reuse this — don't hand-roll a new marquee — for any future "many items scrolling past" component. It's a deliberate middle path between two failure modes already hit once each on this project: a static always-visible grid reads as having "no motion" (the reason the original photo masonry was retired the same day it shipped), while a *vertically* stacked/cycling layout with variable-length content visibly grows and shrinks the section over time (the reason the reviews section was pulled back from a multi-card layout to a single spotlight card). A single-row horizontal marquee gets real motion without either problem, since its own height never changes regardless of which items are currently scrolling through it.

**The photo-gallery half of this (not the generic marquee mechanics) was generalized 2026-08-28.** `assets/js/photo-waterfall.js` originally only looked for `.photo-waterfall[data-gallery]`; it now drives *any* `[data-gallery]` element with a `<template>` full of real `<img>` tags — used by the Past Events waterfall (`events.html`) and, as of the homepage hero redesign, `.hero-proof` on `index.html` (a smaller, hero-scoped real-photo strip reusing the same zone photos/captions as About Gamer Zone's `zone-stack`). Adding a new real-photo gallery anywhere on the site should mean writing a `<template>` of real `<img alt>` pairs and a `[data-gallery]` container with its own scoped `.pw-item` sizing in CSS — not a new JS file. `data-speed` on the container overrides the default 34px/s if a given gallery should feel slower/faster (the hero strip uses 22, since it's a supporting element, not a primary section).

**Positioning and pausing this animation now goes through the Web Animations API (`Animation.currentTime`/`.play()`/`.pause()`/`.playbackRate` via `track.getAnimations()[0]`), not `animation-delay`/`style.animationPlayState` strings — settled 2026-09-08 after a real bug.** The original `GZ.resyncMarquee()` re-seeded a reopened gallery's position with a relative `animation-delay: -${phase}s`, on the assumption that a CSS animation's internal timeline resets to zero while its element is `display:none`. It doesn't — the browser keeps the timeline advancing (or at least doesn't rewind it) in the background, so stacking a negative-delay correction on top of a clock that never stopped double-counted the elapsed time. Confirmed via a live Puppeteer repro (a reopened gallery landing at ~2x a still-open sibling's position) before touching any code — see the roadmap doc's Part 2ac changelog entry for the full repro. `Animation.currentTime` is an absolute value, not a relative offset, so setting it directly overrides whatever happened while hidden instead of trying to out-math it. Any future code that needs to move this animation around (seek, pause, resume, skip) should go through the `Animation` object the same way — don't reintroduce a second, `animation-delay`-based way of doing the same thing.

**Hover/focus pause+skip controls (`GZ.buildMarqueeControls()` in main.js, `.gz-marquee-controls` in style.css), added 2026-09-08 as the F-13 (WCAG 2.2.2, "Pause, Stop, Hide") fix.** Built once per `GZ.marquee()` container in the same non-reduced-motion branch that starts the animation — a real, persistent DOM element for the container's lifetime, so it needs no extra wiring to survive a Past Events `<details>` gallery being closed and reopened. Hovering or keyboard-focusing (`focusin`/`focusout`, which bubble, not `focus`/`blur`) the lane reveals a `rgba(0,0,0,.6)` overlay (dark enough to read clearly, translucent enough that the real content still shows through) with far-left/far-right skip buttons and a center play/pause toggle — the motion itself keeps running underneath the overlay; hovering only surfaces the controls, it does not pause anything on its own (corrected 2026-09-08 same day, per Eric: the first version auto-paused on hover, which he explicitly did not want). Motion only stops when the visitor clicks the play/pause button. Leaving the lane always resets to the default running state and hides the controls, regardless of whatever the play/pause button was set to while hovered — a manual pause is scoped to "while I'm looking at this," not a standing preference that should survive the visitor moving on (or survive a Past Events accordion being closed and reopened — see the `gzHardPaused` dataset flag's handling in `resyncMarquee`). Skipping one card is a smooth animated motion (a temporary `playbackRate` boost polled via `requestAnimationFrame` to an exact target `Animation.currentTime`), not an instant jump, per Eric's explicit spec; a skip completes into "playing" unless the lane was already manually paused (`gzHardPaused`). Not built at all in the `prefers-reduced-motion: reduce` branch — that variant is already fully static with no motion to pause, so WCAG 2.2.2 doesn't apply there. Any future "many items scrolling past" component built on `GZ.marquee()` gets this control scheme automatically, for free — that's the point of it living here instead of per-instance. **Important:** any `GZ.marquee()` instance living inside a flex container whose cross-axis isn't `align-items:stretch` (e.g. `.hero-stage`'s `align-items:center`) needs its container/wrapper explicitly width-constrained (`width:100%;min-width:0`) — see the "One shared container width" section's nested-flex gotcha and the `.hero-proof-wrap` bug fixed the same day this control scheme shipped, where the un-clipped, duplicated `.gz-marquee-track` content (tens of thousands of px wide) blew the flex item's intrinsic width out to match, silently pushing the skip buttons far off-screen even though they were technically still `opacity:1` and in the DOM.

## Shared photo-backed section ("gz-photo-band") and a real url()-in-custom-property bug

Added 2026-09-10, per Eric's go-ahead to fold the homepage's "boring bottom half" into
denser, more heroic sections: `.gz-photo-band` in `style.css` (search "gz-photo-band") is
now the one shared implementation for "a section with real body text sitting on top of a
dimmed real photo," reusing the exact `::before`(image)/`::after`(scrim) two-pseudo-element
pattern `.eu-board` already established, per the standing "one shared implementation, not
several near-identical ones" rule. Two live instances exist so far on `index.html`: the
"Plan your next visit" section (`#visit`, modifier class `.gz-band-visit`) and "Become a
Gamer Zone Ambassador" (`#amb-teaser`, modifier class `.gz-band-ambassador`), replacing what
used to be a plain 3-card grid and a 3-step numbered teaser respectively. The Ambassador
band's three track cards (renamed Collegiate/Influencer/Organization 2026-09-15 — see "Ambassador
redesign" below) use large emoji (🎓🎥🏪, `font-size:3.1rem`) rather than the small SVG glyphs
`ambassador.html` uses for the same tracks — a deliberate, disclosed fallback: Eric asked for
"bigger emojis or images," and a repo-wide search (html/js/json/md, uploads folder, filenames)
turned up no real USC/collegiate photo or logo asset to use instead.

**Correction, 2026-09-15:** that "no USC asset exists" conclusion turned out to be an
artifact of the *search method*, not the actual facts — a filename/metadata-only search
missed real USC Games club branding that's visible *inside* several `EG_Newegg-*.jpg` photos
in `assets/calendar/BGAssets/PhotoReel/` (a jersey reading "USC Games," confirmed by actually
opening and looking at the photos, not just grepping filenames). Those real photos are now
used in `ambassador.html`'s own Ambassador events gallery — see "Ambassador redesign" below.
This teaser band's emoji fallback was *not* swapped for a photo in that same pass (out of
scope for what was asked), but the reasoning above is now stale and shouldn't be read as "no
such photo exists" going forward — a future session revisiting this band should check the
Ambassador gallery's real photos first, not repeat the filename-only search that missed them
the first time. If one is ever supplied, swap it in directly per the no-fabrication rule's
honest-alternative principle — the emoji fallback isn't meant to be permanent, just the honest
option given what was actually known to exist at the time.

**A real bug, not just a screenshot artifact, was caught and fixed while verifying this:**
the first version set each band's photo via an inline `style="--gz-band-bg:url('assets/img/
reel/...')"` custom property, with `.gz-photo-band::before` doing `background-image:var(
--gz-band-bg)`. Both bands rendered as **solid black with the scrim but no photo at all** —
caught by comparing a rendered screenshot's total black against the source photo's own
actual bright colors (a neon-lit gaming photo and a colorful event photo, neither remotely
black), the same "don't trust the CSS on paper, render it" discipline the sizing rules
already require. Root cause: a `url()` token inside a CSS custom property's *value* resolves
against the base URL of the **stylesheet where `var()` is actually substituted in** (this
project's `style.css`, which lives in `assets/css/`), not the HTML document that declared the
property on the element. So `--gz-band-bg:url('assets/img/reel/2026-07-25-15-jpg.jpg')`,
declared inline on an `index.html` element but consumed inside `style.css`, was silently
resolving to `assets/css/assets/img/reel/2026-07-25-15-jpg.jpg` — a 404, confirmed via a
Puppeteer network-request check, not just inspection. **Fixed by dropping the inline custom
property entirely** in favor of two real modifier classes (`.gz-band-visit`,
`.gz-band-ambassador`) that each set `background-image` directly inside `style.css` itself,
using the exact same relative-to-this-file `../img/reel/...` pattern the `.sg-badge`/
`.rank-badge` tier-art rules already use a few hundred lines up — consistent with the site's
existing convention (confirmed by grepping every other `background-image:url(...)` in the
file) rather than a one-off fix. **Lesson for next time:** never set a `url()`-valued custom
property inline on an HTML element for a value that's consumed inside an external
stylesheet — give the real instance its own class in the stylesheet instead, the same way
every other per-variant background-image on this site already works.

Both bands' scrim (`rgba(4,5,7,.72)` to `.85` to `.88`, slightly darker than `.eu-board`'s
own `.82` peak) was re-verified via the full pixel-verified contrast audit after the fix —
708 real text items across all 5 pages, 0 failures — since this was the first time real
body copy (not just a big date/title) sat directly on top of a real photo rather than a
flat/gradient background.

## Homepage photo reel and shared marquee edge-fade, widened 2026-09-10

Per Eric's "enlarge the photo reels, make it look more heroic" request: `.hero-proof .pw-item`
(the homepage hero's real-photo marquee strip) grew from `300px`→`400px` desktop and
`220px`→`280px` mobile — the same `GZ.marquee()`/`photo-waterfall.js` mechanism as before,
just a bigger card size, no new component. Separately, `.gz-marquee`'s shared `mask-image`
edge fade widened from `6%/94%` to `16%/84%` of each marquee's own box width — this reaches
**every** `.gz-marquee` consumer site-wide at once (hero-proof, the Reviews waterfall, and
the Past Events waterfall on `events.html`), which is the point of it being one shared class;
verified via real screenshots and a direct pixel sample across the hero-proof strip's left
edge (near-black at x=0 rising to full brightness by roughly the 16% mark) that the fade is
a genuine gradient and not just a hard crop, plus a full-page screenshot of `events.html` to
confirm the wider fade didn't visually break the other two consumers.

## Site-wide interaction upgrade round (2026-09-10): hero boundary, nav pill, Zone Stack drag, RGB pulse profiles, expandable Ambassador cards, calendar hover/dots

Per Eric's go-ahead after reviewing a research pass on Watermelon UI's animated
components and Proofmode.org's hero transition, six interaction upgrades
shipped together in one round. Each reuses an existing shared mechanism where
one already existed, rather than introducing a parallel one-off — the point
of this section is to record what those mechanisms are so a future session
extends them instead of re-deriving or duplicating them.

**Hero-to-next-section boundary (`.hero-boundary`, `drawBoundary()` in
`techno-hero.js`).** A second, small canvas directly below the hero tunnel
that unrolls the tunnel's own current per-frame morphed shape points (`pts`,
the exact array `frame()` already computed for that frame's rings) into a
horizontal skyline, fills solid black below the line, and strokes the line
itself tinted with the active RGB profile's current hue. Deliberately reuses
the tunnel's own live shape/timing state instead of building a second,
independent shape system — a calmer shape (near-circle) reveals more of the
strip; a spikier shape (star) pushes more black up unevenly. Read `BG_COLOR`
from the real `--bg` CSS variable rather than a hardcoded hex duplicate.

**Nav "continuous tabs" pill (`initNavPill()` in `main.js`, `.nav-pill` in
`style.css`).** A single absolutely-positioned pill element, repositioned via
`getBoundingClientRect()` math and animated via a CSS `transition` on
`left/top/width/height/opacity` — not four separately-`background`-styled
`<a>` states. A literal cross-page slide is impossible on a real multi-page
site (no shared state between loads), so on load the pill "pops/settles"
onto the active link instead of faking a slide from somewhere; hovering or
focusing another link previews a real slide to it, and it reverts to the
active link on mouseleave/focusout. `top`/`height` are JS-driven (not just
`left`/`width`) specifically so this also works on the mobile stacked-column
nav layout, not just the desktop horizontal bar — a nav-pill implementation
that only tracks `left`/`width` will silently break the first time a future
nav layout stacks its links vertically.

**Zone Stack drag/swipe (`assets/js/zone-stack.js`, `--zs-drag` custom
property in `style.css`).** Real pointer-based drag (mouse, touch, and pen
all via the Pointer Events API, not separate mouse/touch handlers) on top of
the existing click/keyboard/dot-nav carousel — the flat, non-rotated
peek-card visual language Eric asked to keep is untouched; the only gap
being filled was that there was no way to drag/swipe the stack at all.
`--zs-drag` is written to `#zone-stack` and inherits down into every
`.zone-card`'s own `translateX(...)` via `calc(... + var(--zs-drag, 0px))`,
so one JS-set custom property moves the center card and both peek layers
together without a bespoke per-position transform string. `.zone-stack.
dragging` kills the cards' normal `.55s` transition so the drag tracks the
pointer 1:1 with no lag; removing that class on release (in the same tick as
resetting `--zs-drag` and/or calling `next()`/`prev()`) lets the existing
transition animate the snap-back or the advance, so dragging and clicking
share one easing curve rather than two separate animations. `touch-action:
pan-y` on `.zone-stack` hands horizontal gesture detection to JS while still
letting a mostly-vertical touch scroll the page natively, instead of the two
racing. A `dragMoved` flag suppresses the existing "click a peek card"
handler immediately after a real drag, so releasing a drag on top of a peek
card doesn't also fire a second, conflicting `goTo()`.

**RGB lighting: three new pulse profiles (`pulse`/`rapidpulse`/`multipulse`
in `techno-hero.js`'s `colorState()`, "Heartbeat"/"Rapid Pulse"/"Multi-Pulse"
in `#hero-lighting-select`).** All three are built from soft Gaussian
brightness bumps, never a hard on/off flash, and all stay under 3 beats/sec
— WCAG 2.3.1's photosensitive-seizure flash threshold — a real constraint
this project should keep respecting for any future lighting profile, not
just these three. Pulse and Rapid Pulse are the same "lub-dub" heartbeat
shape at two different single rates (1.8s vs. 0.85s) with two different
hues; Multi-Pulse assigns each ring to one of three channels (by index),
each with its own independent period/width/hue via the existing shared
`travelSpike()` helper, so several distinct pulses read as genuinely
layered across the tunnel's depth rather than one synchronized wash. Adding
a profile is still just: extend `PROFILES`, add a `case` to `colorState()`
returning `{hue, breatheMul, ringHue, ringAlpha}`, add one `<option>`.

**Ambassador expandable profile cards (`.host-card.is-expanded` in
`style.css`, the expand-card IIFE in `ambassador.js`).** A card expands in
place into a side-by-side photo/bio layout via one real `<button
class="host-expand-btn">` per card (never the whole card made clickable,
since `.host-social`'s own links live in the same card and need their own
independent focus stop). `.host-photo` and `.host-body` are the *same*
elements in both the collapsed and expanded state, just reflowed by
`grid-column:1/-1` + `flex-direction:row` on `.host-card.is-expanded` — there
is no second, duplicated "detail panel" copy of the card's text that could
ever drift out of sync with the first (the exact failure mode the
`screenshot-monthly-calendar.html` drift bug, documented earlier in this
file, warns about). The one genuinely new element, `.host-cta`, reuses the
page's existing real "Apply to become an Ambassador" action
(`data-amb-open`) rather than inventing new placeholder content for the
expanded state, consistent with this section's own no-fabrication framing
(see the F-04 comment above `#host-grid` in `ambassador.html`). One-open-
at-a-time accordion behavior and Escape-to-close (returning focus to the
card's own toggle button) are handled by the same IIFE. **A real bug caught
while building this:** `main.js`'s `injectIcons()` deliberately does NOT
carry a `class` attribute from a placeholder `<i data-ic="...">` onto the
`<svg>` it gets replaced with (see that function's own comment — it computes
the SVG's class itself). A class meant to control that icon (here, the
toggle button's rotating chevron) has to live on a wrapping element instead
of the `<i data-ic>` itself, or it silently vanishes the moment the icon
loads — confirmed by a `getComputedStyle().transform` check via Puppeteer
that returned `none` until the class moved to a wrapper `<span>`. Any future
icon that needs a *toggleable* class-driven style (not a fixed inline
`style=` attribute, which does get carried over — see the zone-prev arrow's
`scaleX(-1)`) needs the same wrapper treatment.

**Event Calendar hover/focus tooltip + event dots (`calendar.js`,
`.cal-dot` in `style.css`).** Two additive layers on top of the existing
`.cal-cell` grid, neither replacing anything that was already working: (1)
every cell gets a `data-full` attribute (a one-line preview: event type +
title + time, or "Free Play"/"Closed") and `GZ.initFullTextTooltips(grid)`
is called after every `render()` — this is the *exact same* shared tooltip
component the Games list and Reviews already use (`main.js`, `.gz-tooltip`
in `style.css`), not a new bespoke calendar tooltip, so it inherits that
component's positioning/contrast/reduced-motion handling for free and shows
on both hover *and* keyboard focus. (2) a small pulsing `.cal-dot` renders
only on days with a specific named event (theme/edu/amb/major, never Free
Play or Closed), colored to match that day's own existing type color — a
deliberate, non-color-dependent redundant signal (WCAG 1.4.1, "use of
color") that a day has something specific happening, on top of the color
coding that was already there. The existing full `.cal-detail` panel below
the grid, its hover/click/keyboard update logic, and the closed-day
exclusions are all unchanged. `.cal-cell`'s hover/focus-visible states also
gained a real lift (`transform:translateY(-2px) scale(1.05)` plus a soft
drop shadow) in place of the old flat `filter:brightness(1.25))`-only
feedback, disabled under `prefers-reduced-motion: reduce` alongside every
other transform-based hover effect on this page.

All six were verified via Puppeteer with real simulated input over real
time (drag/swipe sequences via `Input.dispatchTouchEvent`, a full drag/click/
keyboard/Escape sweep on the Ambassador card, canvas pixel-brightness
sampling across ~2.5s for each new RGB profile, hover+focus tooltip checks
on the calendar) rather than static screenshots or absence-of-console-errors
alone — see this round's own screenshots in `tools/audit/out/redesign-round/`
for the visual record at mobile/tablet/desktop. Full scripted QA
(`tools/audit/run-full-qa.sh`) re-run clean after all six: 709 text items
across 5 pages / 0 contrast failures, 0 container-width findings, 0 console
errors on any page.

## Featured Gear marquee (2026-09-11): real Newegg products tied back to the retailer

Per Eric, following a senior-designer wow/design audit that flagged "Newegg
the retailer is nearly invisible past the homepage" as a real gap: a new
`#featured-gear` section on `index.html`, between About Gamer Zone and
Reviews, showcasing real Newegg products in a `GZ.marquee()` lane
(`assets/js/featured-gear.js`, `.gear-item`/`.gear-item-img`/etc. in
`style.css`) — the same shared marquee mechanism as Reviews and the Past
Events/hero-proof photo waterfalls, not a new carousel. This is Phase 1 of
a larger scoped plan from that audit; Phases 2-5 (interior-page hero
differentiation, real photography on Games/Academy/Ambassador, Ambassador
tier-art variety, RGB-picker discoverability) are queued in the roadmap
doc's Part 4 and still need Eric's go-ahead before any of them are touched,
per core rule 15.

**Data provenance.** All 14 products (name, price, spec line, real product
photo URL, live outbound link) were hand-verified against their actual
Newegg.com product pages on 2026-09-11 — see `featured-gear.js`'s own
header comment for the full no-fabrication note. Per Eric, these are
described as gear *similar to* what's running in the Gamer Zone, not
claimed as the exact serial-numbered floor units — the section's own copy
("We feature similar products in our Gamer Zone...") says exactly that,
deliberately, per core rule 4. Prices are a snapshot from that date and
will drift from Newegg's live price over time; this section is a
browse-and-buy pointer to the real product page (which always shows the
live price), not a live price feed — re-verify the pool against Newegg.com
again before treating these prices as current. Product names are
deliberately shortened from Newegg's full SEO-stuffed listing titles (e.g.
"MSI MPG 271QRX QD-OLED Monitor" rather than the ~30-word full title) —
this is accurate, concise real naming, not truncation or fabrication; the
brand/model are unchanged.

**A real bug caught and fixed while building this:** the first version set
`loading="lazy"` on each card's `<img>`, the opposite of what
`photo-waterfall.js`'s own header comment explicitly warns against for
exactly this shape of component — every card in a `GZ.marquee()` track
(both the real set and the duplicated copy) is already sitting in the DOM
from render, just visually clipped by the track's `overflow:hidden` until
the scroll brings it into view, not actually absent from the page.
Lazy-loading confirmed via a live Puppeteer check (`naturalWidth === 0` on
a real fraction of the 28 rendered `<img>` elements — 14 real + 14
duplicated) before the fix, `naturalWidth > 0` on all 28 after removing
`loading="lazy"`. Any future `GZ.marquee()` card type should follow this
same "everything eager-loads, the track's own overflow does the visual
hiding" rule rather than reaching for `loading="lazy"` out of habit.

Product photos sit on a white card well (`.gear-item-img{background:#fff}`)
rather than the site's dark card background — these are real studio product
photos shot on white, so a white well matches the source image honestly
instead of looking like an arbitrary design choice fighting the photo.
Verified via the full pixel-verified contrast audit (342 text items on
`index.html`, 0 failures) and the full scripted QA suite across all 5
pages (0 contrast failures, 0 container-width findings, 0 console errors).

## Interior-page hero icon badges (Phase 2, 2026-09-11)

Second phase of the design-audit follow-through (Phase 1 was the Featured Gear marquee, see
above). The audit's finding: `events.html`/`games.html`/`edu.html`/`ambassador.html` all share
the exact same `.hero` markup (kicker, h1, lead, one faint diagonal stripe) with nothing
visually distinguishing which page you're on beyond the copy itself — a real "brand
dissonance"/flat-page issue, not a hypothetical one.

**Fix:** a small circular icon badge (`.hero-top`/`.hero-icon-badge` in `style.css`) sits next to
each page's kicker line, one real icon per page from the *existing* shared icon set in
`main.js` — `events.html` → `cal`, `games.html` → `gamepad`, `edu.html` → `grad`,
`ambassador.html` → `shield`. No new icon asset was drawn; this reuses the exact badge
treatment `.amb-class-icon` already established (circle, `--ne-orange` border/fill, centered
`.ic`) rather than inventing a new shape, per the "one shared implementation" rule. `.hero-stage`
(the homepage's own techno-canvas hero) is untouched — it never used `.kicker`/`.hero-decor`
the same way and already has its own distinct treatment, so this phase only touches the 4
interior pages the audit actually flagged.

**Scope note:** this is the hero-only piece of the audit's "interior pages read identical"
finding. Real page-specific photography (the audit's other ask for these same 3-4 pages) is
Phase 3, not this phase — deliberately kept separate since it needs real photo assets sourced
per page, not just a markup/CSS change with existing resources. Verified via the full scripted
QA suite across all 5 pages (826 text items, 0 contrast failures, 0 container-width findings, 0
console errors) plus mobile/tablet/desktop screenshots confirming the badge doesn't wrap/clip
against the kicker at any width.

## Real photography on Academy + Ambassador (Phase 3, 2026-09-15)

Third phase of the design-audit follow-through (Phase 1: Featured Gear marquee; Phase 2:
interior hero icon badges — both above). The audit's other ask for the interior pages was
real, page-specific photography, deliberately deferred out of Phase 2 since it needed real
photo assets sourced per page rather than just a markup/CSS change with existing resources.

**Sourcing, per Eric's direct instruction:** for `edu.html`, Diamond Bar High School, Bosco
Tech, and Lorbeer Middle School; for `ambassador.html`, "collegiate images with USC or the EG
valorant tournament images and Ugreen x WD." A repo-wide search of `assets/calendar/BGAssets/
PhotoReel/` (the same real-photo pool the homepage/events marquees already draw from) found
real, correctly-labeled photos for every source **except** USC — no USC-branded or collegiate
photo exists anywhere in the repo (consistent with the existing Ambassador emoji-fallback note
above, which already documents this same earlier search coming up empty). Per the no-
fabrication rule, USC was left out rather than substituted with a generic stock photo; the two
real EG_Newegg-labeled photos turned out to actually be from an **Evil Geniuses VALORANT
Collegiate Cup** 1st-place check presentation (confirmed by reading the check itself in the
photo) — genuinely collegiate esports content, just not USC-specific, so it covers the spirit
of Eric's "collegiate" ask honestly without overclaiming a school affiliation that isn't there.

**Implementation:** two new real-photo galleries using the exact same shared `[data-gallery]`/
`<template>`/`photo-waterfall.js` mechanism as the Past Events waterfall on `events.html` —
not a new component. `edu.html` gained a "Schools we've hosted" section (6 photos: 2 each of
Diamond Bar, Bosco Tech, Lorbeer) right after the existing "Schools & groups" section.
`ambassador.html` gained an "Ambassador events at the Zone" section (3 photos: 2 Evil Geniuses
VALORANT Collegiate Cup, 1 UGREEN x WD) right after "How it works." Both pages needed
`photo-waterfall.js` added to their script tags for the first time (previously only
`events.html`/`index.html` used this gallery pattern). Source photos came from
`assets/calendar/BGAssets/PhotoReel/` (full-resolution originals, 3.4-9.3MB each) and were
resized to 1008px-wide JPEGs (`assets/img/AcademyPartnerSchools/`, `assets/img/
AmbassadorSpotlight/`) matching the existing web-optimized convention every other
`photo-waterfall` gallery on the site already uses (`assets/img/FantastechParty-06-20/` etc.
are all 1008x567 JPEGs, not the raw multi-MB originals) — confirmed by checking that
convention before resizing, not assumed.

**Games page copyright question, answered but not acted on:** Eric separately asked whether
using game images (box art, screenshots, logos) on `games.html` carries copyright/liability
risk. Answer: yes, real risk — those assets are generally copyrighted by their publishers, and
displaying them without a license on a corporate-branded commercial site is a genuine exposure,
not a hypothetical one. No specific real photo source was given for Games (unlike Academy/
Ambassador above), so per core rule 15 this is an open design question, not a fully-specified
instruction — proposed to Eric rather than implemented: either source real, licensed press-kit
assets per title, use real Gamer Zone photography instead (people playing on the floor, not
per-game copyrighted art), or leave the existing icon/text-based game list as-is. `games.html`
itself was not touched photographically this round.

**Correction, same day, later in the session:** "no USC-branded or collegiate photo exists
anywhere in the repo" above was wrong — it was a filename/metadata-only search, and the real
USC content was sitting in plain sight *inside* photos whose filenames didn't mention USC at
all. Eric flagged more `EG_Newegg-*.jpg` photos to check, and opening them (not just grepping
names) turned up several showing a real "USC Games" club jersey competing at the same Evil
Geniuses VALORANT Collegiate Cup — genuine USC collegiate content. Three of those
(`eg-valorant-03-usc.jpg`, `-04-usc.jpg`, `-05-handshake.jpg`) were added to the Ambassador
gallery in the same-day "Ambassador redesign" round below. **Lesson for next time:** a
"does X photo exist" search across this repo's real event photography needs to include
actually opening and looking at a representative sample of candidate photos, not just
filename/keyword matching — brand/team identity in these photos usually lives on a jersey,
banner, or check in the shot, not in the file's own name.

**Site-wide cache-busting version bump:** `?v=81` → `?v=82` across all `<link>`/`<script>` tags
in all 6 HTML files, per the shared-version convention (see "Cache-busting convention" note
elsewhere in this file) — needed regardless of page since `photo-waterfall.js` is now a new
dependency on two pages that didn't reference it before.

Verified via the full scripted QA suite across all 5 pages (828 text items, 0 contrast
failures, 0 container-width findings, 0 console errors) plus a live DOM check confirming both
new galleries' marquee tracks build correctly (12 `<img>`s on Academy's gallery — 6 real + 6
duplicated for the loop — and 6 on Ambassador's, all with real `naturalWidth`, no
`loading="lazy"` per the established `GZ.marquee()` eager-load rule) and mobile/tablet/desktop
screenshots confirming no clipping against the shared container.

## Ambassador redesign: 3 tracks + vertical pillar tiers (2026-09-15, same-day follow-up)

Per Eric, right after Phase 3 above: the three Ambassador classes (Community Leader/Esports
Host/Event Organizer) were renamed to **Collegiate/Influencer/Organization** with real,
distinct application flows, and the "Your Ambassador Journey" tier ladder was rebuilt from a
cascading horizontal bar stack into **4 vertical pillars**. Both changes shipped together
since the new track copy and the tier redesign touch the same page and were approved in one
go-ahead.

**Three tracks, real definitions from Eric (not invented):** Collegiate covers school clubs
and officers — on-campus brand representation, can host at the Zone but with a more thorough
application (real on-site content shooting, a club sponsorship agreement), and can also cover
a sponsored Newegg event out at the student's own campus. Influencer covers individual
creators who bring their own community here. Organization covers clubs, vendors, and local
businesses — explicitly including small shops like TCG, game, and tech stores, per Eric's own
addition, not a generic "vendors" catch-all. Only Influencer and Organization are purely
here-at-the-Zone tracks; Collegiate is the one with a genuine offsite/sponsorship dimension.
The CSS modifier classes were renamed to match (`class-shield/class-sword/class-bow` ->
`class-collegiate/class-influencer/class-org`) — same three accent colors as before (blue/
pink/green), only the names changed, so nothing needed re-deriving. The homepage's
`#amb-teaser` band (`.amb-class-teaser`, part of `gz-photo-band` above) was updated to match
the same three names/copy/icons (🎓🎥🏪) so the site doesn't have two different sets of track
names in two places — see that section's own correction note re: the emoji-vs-real-photo
question.

**Per-track "Apply as X" CTAs, and a real form field to back them.** Previously there was one
generic "Apply to become an Ambassador" button and visitors had no way to say which track they
were applying for except free-text. Each of the three track cards now has its own
`.btn.ghost` CTA (`data-amb-open data-track="Collegiate|Influencer|Organization"`), and the
modal's real Formspree form (`#amb-form`) gained an actual required `<select name="track">`
field. `ambassador.js`'s `open(track)` sets that field on open — **and resets it to blank when
no track is given** (the hero and Featured-Ambassador-card CTAs still carry no `data-track`).
That reset is a real bug fix, not a preemptive one: the first version only set the field when
a track was passed, so opening via a track-specific CTA, closing without submitting, then
reopening via the generic hero CTA left the previous track silently still selected — confirmed
via a live Puppeteer click-through (open Influencer's CTA -> close -> open the hero's generic
CTA -> check the select's value) before and after the fix.

**Tier ladder: 4 vertical pillars, not a cascading bar stack.** Per Eric ("instead of left to
right, just have 4 pillars of increasing amount of events, so 4 vertical pillars"): `.tl`
(a flex column of 4 bars, each a bit wider/more indented than the last) is now
`.tier-pillars` (a CSS grid, 4 equal columns side by side, `align-items:start` so each column
keeps its own independent height instead of stretching to match the tallest). All the actual
tier content (`.mile`, `.mile-head`, `.mile-count`, `.rank-badge`, the perks `<ul>`, the
tier-color rules, the Diamond `gz-shine`) is unchanged and still works exactly as before —
only the outer container changed from a flex column to a grid row, and `.mile-head` gets a
scoped `flex-direction:column` override inside `.tier-pillars` (badge on top, then count, then
unlock name, all centered) since a 4-column layout doesn't have the ~800px of width the old
single-wide-bar design assumed.

**The "increasing pillar" effect comes from a real min-height floor per tier, tuned against
actual rendered content, not guessed round numbers.** First pass used naive +40px steps
(420/460/500/540) and looked wrong: Silver's own real content (4 perks) already renders at
463px, taller than Gold's naive 460px floor, so the two nearly matched instead of escalating.
Measured all 4 tiers' real rendered heights via Puppeteer (`getBoundingClientRect`) before
landing on the final values — silver 420 (Silver's real content wins at ~463px regardless),
gold 505, platinum 545, diamond 585 — which produces a clean, real 42px step at every tier
once you account for what Silver's content actually forces. This is the same
min-height-as-a-floor-not-a-forced-height principle "Container & sizing discipline" already
establishes elsewhere in this file, just tuned against measured reality instead of assumed
symmetry. At tablet width (@820px) the grid collapses to 2x2 (still reads as "pillars," two
rows of two) and at phone width (@560px) to a single column with min-heights dropped entirely
— once every tier is stacked full-width rather than compared side by side, a height floor
stops doing any real visual work and just adds dead scroll.

**Medal icon reused 7x, now differentiated (this was Part 4 roadmap item "Phase 4" and got
folded into this same round since Eric asked for it directly).** Every `.rank-badge` (the 4
tier pillars) and every `.sg-badge` (the 3 attendance-bonus badges) used the exact same
`medal` glyph — visually identical icon at every rank, no differentiation beyond the
background-photo tint and border color. Reused existing icons from the shared `GZ_ICONS` set
(`main.js`) rather than drawing new ones: Silver -> `shield` (a starting-tier baseline),
Gold -> `coin` (literally the gift-card perk), Platinum -> `chip` (the product-prize perk),
Diamond -> `trophy` (the top tier). Attendance bonuses: 20+ -> `note` (the social spotlight
post), 40+ -> `coin` (gift card prizing), 60+ -> `chip` (product prizing). The Diamond perk
list's own `medal` bullet icon ("Featured professional profile...") was left alone — that's a
perk-list bullet, not a rank-identifying badge, and "medal" still reads correctly there.

Verified via the full scripted QA suite across all 5 pages (831 text items, 0 contrast
failures, 0 container-width findings, 0 console errors), a live Puppeteer measurement of all 4
pillar heights confirming the real escalation (463/505/545/585px), mobile/tablet/desktop
screenshots of the new pillar grid and track cards confirming no clipping and clean 2x2/1-col
collapse, and the click-through test above confirming the per-track CTA + form-reset behavior.

## Reviews section: real-content word emphasis + derived highlight tags (2026-09-15)

Per Eric, following up on the audit's still-open "generic review cards" item (Part 4 #9,
Phase 4): the Reviews waterfall's cards were functionally fine but all looked identical --
five stars, italic quote, name -- with nothing to catch the eye card-to-card, which read as
placeholder-feeling even though every quote is a real Google review. Rather than hand-editing
any of the 62 real reviews (or, worse, writing new "highlight" copy that isn't actually in the
review), `reviews.js` now runs one small shared pass over each card's own real text:

- **`HIGHLIGHT_TERMS`** (`reviews.js`) is an ordered list of real recurring phrases already
  present across this specific review pool (`free`/`completely free`/`free snacks`, `VR`,
  `raffles`, `giveaways`, `hidden gem`, `kid friendly`, `tournaments`, `clean`, `immersive`,
  `vibe`, `staff`, `events every`), longest/most-specific phrase first so e.g. "free snacks"
  wins over the bare "free" it contains (see the `used` containment check in
  `deriveHighlights()`).
- **`deriveHighlights(rawText)`** bolds up to 2 real matches per card in the actual quote text
  (`.rv-hl`, styled upright + `--ne-orange` -- an existing, already-contrast-checked color, not
  a new one) and returns the *first*-priority match as a small pill tag (`.rv-tag`) rendered
  above the quote (e.g. "Free to Play," "Great Vibe," "Raffles & Prizes"). A short review with
  no matching theme (e.g. "Very fun," "Impressive work") gets no bold and no tag at all --
  honest silence over a forced, meaningless label, consistent with the no-fabrication rule.
- This is the same "one shared implementation" principle as `gz-shine`/`gz-marquee` elsewhere
  in this file: one pass, applied uniformly to every card, rather than manually tagging 62
  reviews by hand (which would also silently go stale the next time the pool is edited).

Verified via a live Puppeteer check across both marquee lanes (48 rendered cards -- 24 real +
24 duplicated for the loop -- 26 got a real tag, 22 got none) and the full scripted QA suite
(945 text items across 5 pages, 0 contrast failures, 0 container-width findings, 0 console
errors), plus a mobile-width (250px card) check confirming no `.rv-tag` overflows its card at
any of the 26 tagged cards. This addresses the "generic-review-card refresh" half of Part 4
#9's still-open Phase 4 item; the secondary-button styling pass is still open.

## Hero-to-Weekly-Lineup boundary: dropped the shape-matched canvas, plain fade instead (2026-09-15)

Per Eric: the shape-matched "skyline" boundary canvas (`.hero-boundary`, `drawBoundary()` in
`techno-hero.js` -- see "Site-wide interaction upgrade round" above for its original
2026-09-10 build) read as "not really aligned with anything." Removed entirely --
`boundaryCanvas`/`sizeBoundary()`/`drawBoundary()` and their call sites in `techno-hero.js`,
the `<canvas id="hero-boundary-canvas">` in `index.html` -- and replaced with a plain
`.hero-boundary` div: `background:linear-gradient(180deg,transparent 0%,var(--bg) 100%)` at
the same height/full-bleed width the canvas used to occupy. No shape to misalign now; the
background simply reads as fading to black on the way down into Weekly Lineup, working
alongside the pre-existing `applyTechFade()` (`main.js`) that already dims the fixed tunnel
layers' opacity over this same scroll range, unchanged. Confirmed via grep that no other file
still references `hero-boundary-canvas`/`drawBoundary`/`boundaryCanvas` after the removal.

## Featured Gear cards: equal button height + no autoscroll (2026-09-15)

Per Eric: "the view on newegg button should be exactly the same height across the cards...
ensure that buttons within cards are similar. also... I can't click on the view on newegg
because the scrolling feature pause blocks it. Don't make that section autoscroll then." Two
related fixes to `#featured-gear` (see "Featured Gear marquee," 2026-09-11, above):

**Click-block fix.** `GZ.buildMarqueeControls()`'s hover-to-reveal pause/skip overlay (see
"Shared infinite marquee" above) is a full-lane `pointer-events:auto` scrim while visible --
harmless for Reviews/the photo waterfalls, which have no per-card click target underneath it,
but it silently intercepted clicks on this section's real "View on Newegg" links the moment a
visitor hovered to reach one. Rather than patch that overlay's hit-testing, per Eric's own
call this section now opts out of auto-scrolling entirely via a new `opts.static` flag on
`GZ.marquee()` (`main.js`): it reuses the exact same "no animation, no duplicated DOM, no
controls overlay, wraps via flex-wrap" branch already built for `prefers-reduced-motion`,
just triggerable per-instance regardless of the visitor's own OS motion setting --
`featured-gear.js`'s call is now `GZ.marquee(wrap, GEAR.map(cardHTML), { static: true })`. Any
future marquee section with real per-card click targets underneath it can opt into the same
fix via `{ static: true }` rather than a bespoke patch.

**Button-height fix.** `.gear-item` is now a flex column with its `.btn` pushed to
`margin-top:auto`; every card in the same row already stretches to the tallest sibling's
height (the grid's default `align-items:stretch`, unchanged), so the button now always sits
flush against the bottom of that shared height regardless of how many lines a given card's
spec text wrapped to, instead of its Y position drifting card to card. `align-self:flex-start`
keeps the button its own natural content width rather than stretching full-width, matching how
it looked before.

Verified via a live Puppeteer check (28 rendered `<img>`s -- 14 real, no longer duplicated for
a loop since the lane is now static -- all with real `naturalWidth`) confirming every "View on
Newegg" link is a normal, always-clickable anchor with no overlay in front of it, plus the full
pixel-verified contrast audit and console/width checks across all 5 pages.

## Photo bands: HD photos, darker scrim, real ambassador track icons (2026-09-15)

Per Eric: "use more HD photos for the plan your next visit and become a gamer zone ambassador,
make those sections more readable and darken the background more. Use the same class symbols
as on the ambassador page on the home ambassador section." Three changes to `.gz-photo-band`'s
two live instances (`#visit`, `#amb-teaser` -- see "Shared photo-backed section" above):

**HD photos.** Both bands' `background-image` swapped from the 640x360 `assets/img/reel/`
copies (sized for the hero's small photo-strip cards) to two new 1008x567 copies in
`assets/img/PhotoBands/` (`visit-band.jpg`, `ambassador-band.jpg`) -- the same real photos
(`assets/calendar/BGAssets/PhotoReel/2026-07-25 (15).jpg` and `2026-06-20 (10).png`
respectively), just each band's own real full-resolution source instead of a thumbnail meant
for a ~300px hero card. 1008px is this repo's actual real-resolution ceiling for these dated
PhotoReel batches (confirmed via `PIL.Image.open(...).size`, not assumed) -- no synthetic
upscaling.

**Darker scrim.** `.gz-photo-band::after`'s gradient darkened from `.72/.85/.88` to
`.84/.92/.95`. Re-verified via the full pixel-verified contrast audit afterward, same
discipline as every prior scrim-opacity change on this file.

**Real ambassador icons, replacing the large-emoji fallback.** The three homepage
`#amb-teaser` track cards (`.amb-class-teaser-card`) now reuse `.amb-class-icon` -- the exact
circular icon-badge component `ambassador.html`'s own track cards already use (see
"Ambassador redesign," 2026-09-15, above) -- with the same real grad/sword/bow icons and
per-track colors (`class-collegiate`/`class-influencer`/`class-org`), replacing the
🎓🎥🏪 emoji fallback. `.amb-class-teaser-emoji` and its rule were removed. This is a symbol
match only (same icon glyphs, same colors) -- it does not revisit the emoji-vs-real-photo
question that section's own comment already documents; see that comment for the current state
of the "is there a real USC/collegiate photo" question.

Verified via mobile/tablet/desktop screenshots of both bands (no clipping, text legible against
the darker scrim + new photo at every width) and the full pixel-verified contrast audit (891
text items across 5 pages -- see the games-category-cards entry below for the 2 unrelated
pre-existing findings this run also surfaced and their triage).

## Games page: real-photography category cards ("game-cat-*") (2026-09-15)

Per Eric: "scan our current photography and add those as core images for each category,
ensuring its a similar style to how images are done on other sections or like the gamer zone
cards." New `#games-categories` section on `games.html`, right after the hero and before the
Top Played Games chart: one card per platform-filter chip (PC/Consoles/VR/Racing
Simulators/Arcade), styled with `.zone-card`'s own visual language (real photo, bottom
gradient fade into `var(--bg-2)`, orange accents, uppercase centered title) via new
`.game-cat-*` classes in `style.css` -- but as a plain CSS Grid of real `<button>` elements,
not a carousel: every zone is visible and clickable at once here, so none of `.zone-card`'s
absolute-position/`data-pos`/drag machinery applies, and a real `<button>` already gets
keyboard reachability + Enter/Space activation + a focus state for free (core rule 8 satisfied
without any custom widget code).

**Photo sourcing: reused, not new.** Each card reuses the exact real Gamer Zone floor photo
already captioned for that same physical zone in About Gamer Zone's Zone Stack (`index.html`)
-- PC -> `dailyplay-bg.jpg`, Consoles -> `console-lounge-bg.jpg`, VR -> `vr-station-bg.jpg`,
Racing Simulators -> `event-update-bg-week4.jpg` (captioned "Racing & Immersive Zone" there,
the real match for this filter). **Arcade has no real matching photo anywhere in the repo** --
confirmed via a full visual contact-sheet review of every generic PhotoReel event photo (99
photos, viewed directly, not just filename-matched -- the same rigor the Ambassador
gallery's USC-photo correction earlier this session established as the right method). Per the
no-fabrication rule, Arcade gets an honest icon-only card (`.game-cat-art-empty`, the same
`coin` icon already assigned to Arcade in `games.js`'s `PLATFORMS`) instead of a mismatched or
duplicated photo.

**Wired to the existing filter, not a second list.** Clicking a card clicks the matching chip
in `#games-filters` (`games.js`'s new `catGrid` click handler), reusing that chip's own
filter/render/active-state logic wholesale, then scrolls the filter row + list into view --
there's no separate data or markup for the cards to drift out of sync with the real game list.

Verified via live Puppeteer input (a real mouse click on the VR card correctly set the active
chip, re-rendered the list, and scrolled the page; a keyboard-only Tab-to-focus + Enter on the
Arcade card did the same via native `<button>` behavior, with a real, visibly-rendered
`:focus-visible` outline confirmed via computed style -- not just present in the CSS) and
mobile/tablet/desktop screenshots (2-column wrap at mobile, 4+1 at tablet, all 5 in a row at
desktop, no clipping).

**The same full-site audit run also surfaced 2 findings, both triaged as pre-existing false
positives unrelated to this session's work** -- see "A known false-positive category" under
"Readability" above for the full root-cause and math: `games.html`'s active nav link
(1.04:1) and `index.html`'s "ZONE 1" badge (also 1.04:1), both decorative orange
badges/pills sitting behind a load- or carousel-triggered CSS transition that the audit's
screenshot pass can catch mid-transition. Real settled contrast is 8.37:1 and 9.91:1
respectively -- confirmed via direct pixel sampling after a full settle, not just re-reading
the CSS. No site content changed for either.

**Correction, 2026-09-17: Arcade now has a real photo, superseding the icon-only placeholder above.** Eric supplied a real photo of the Zone's own fighting-game/arcade station (a character-select screen on a large monitor with a dual-joystick arcade-stick control panel, flanked by the PC lounge's neon lighting) and asked for it to be cropped to match the other four zone cards' style. Cropped to the same 3:2 ratio the other four `game-cat-*` photos already use (light top/bottom trim, full width kept, since the source was 4:3 and only needed a modest ratio adjustment -- see the crop math in `games.html`'s own comment above the Arcade card), resized to the same 900x600 convention, and saved as `assets/calendar/BGAssets/arcade-bg.jpg`. The `.game-cat-art-empty`/icon-only markup and its no-fabrication reasoning above is now historical -- Arcade uses the exact same `.game-cat-art`/`<img>` markup as PC/Consoles/VR/Racing Simulators, no CSS changes needed. Verified via a live Puppeteer check (`naturalWidth`/`naturalHeight` both real, click still correctly filters the game list below) and mobile/tablet/desktop screenshots confirming it sits flush with its four siblings at every width; the full contrast/width/console audit re-run clean (0 new findings on `games.html`, only the already-disclosed pre-existing Featured Gear findings on `index.html`).

## XP League image swap: real logo mark, not an action-photo banner (2026-09-18)

Per Eric ("pick a better XP league image, even just a simple logo"): `edu.html`'s `#esports`
section previously showed a self-hosted action photo (`xpleague-banner.jpg`, sourced from XP
League's own Irvine, CA league page -- see that section's now-superseded comment) stretched
full-width via `style="width:100%"`. That treatment read as a generic stock action shot rather
than something that actually identified the partner brand, so per Eric's own "even just a
simple logo" framing it's replaced outright with XP League's real logo mark instead of another
photo.

**Sourcing, following this project's own "actually open and look at candidates" rule** (the
same discipline that caught the earlier USC-photo and mis-cropped-`Logo.png` misses elsewhere
in this file): fetched `https://xpleague.com/` and `https://xpleague.com/california-irvine/`
directly and pulled every real logo-shaped asset referenced in their own markup -- three
candidates total. `Logo.png` (their own uploads folder) turned out to be only the small green
swoosh fragment of the full mark, illegible on its own -- this is the exact same asset this
file's Ambassador-photo section already flagged as "a tiny, unrecognizable icon fragment" when
rejected in an earlier round, re-confirmed by actually opening it again rather than trusting
the earlier note secondhand. A `featuring-green-1024x283.png` graphic further down their page
turned out to just read "FEATURING" in green block letters -- part of their own "as seen in"
press strip, not their logo at all. Their real site-icon asset
(`cropped-favicon-192x192-1.webp`, referenced in their own `<link rel="icon">` and
`msapplication-TileImage` tags, 192x192 -- the largest version they publish anywhere on the
site, confirmed by probing for larger common WordPress site-icon filename patterns and getting
404s) is the actual complete mark: a rounded-square navy badge with the white/green "XP"
wordmark, clean and legible at small sizes. That's the one used.

**Implementation.** Self-hosted (same ORB/hotlinking reasoning as the original banner photo --
XP League's CDN blocks direct hotlinking in real Chromium) as
`assets/img/XPLeague/xpleague-logo.png`. Displayed small and centered (`140x140px`, rounded
corners, a soft drop shadow) rather than stretched to the card's full width -- a logo reads as
a brand identifier at a moderate, fixed size; stretching a 192x192 square mark to a ~1000px-wide
card would have looked distorted and oversized, the same "don't force a fixed-shape asset into
a mismatched box" reasoning this file's sizing-discipline section already applies elsewhere.
The old banner photo file (`xpleague-banner.jpg`) was left in place on disk rather than deleted
(no other page references it, but this project doesn't delete real assets speculatively without
a reason to).

Verified via a live Puppeteer check (`naturalWidth`/`naturalHeight` both real at 192x192,
rendering at the intended 140x140 box) and mobile/tablet/desktop screenshots confirming the
logo sits centered and legible, with the surrounding Wednesday/Friday cards unaffected; the
full contrast/width/console audit re-run clean on `edu.html` specifically (0 findings), with
only the already-disclosed pre-existing Featured Gear horizontal-overflow findings on
`index.html` and nothing new anywhere else.

**Superseded the same day** -- see "Home/Games/Academy multi-page update round" below: Eric
came back and said the logo-only treatment (specifically, comparing it against "the current
image of the child") read as unnatural/distorted, and asked for an authentic action photo
instead. The logo file (`xpleague-logo.png`) is left on disk, unreferenced, per this project's
own "don't delete real assets speculatively" convention already stated above.

## Home/Games/Academy multi-page update round (2026-09-18)

Per a large, explicit, fully-specified requirements message from Eric covering three pages at
once -- proposed back to him first per core rule 15 (three genuinely open sub-questions were
resolved via `AskUserQuestion` before any file was touched: Jackbox Party Pack 7's fate, which
real photos to use for the three brand-new zones, and whether to keep the just-shipped XP
League logo or search for a real action photo instead), then implemented in full once answered.

**Home -- About Gamer Zone expanded from 5 to the real 8 official zones.** The prior 5-card
grid (with two wrong names -- "Racing & Immersive Zone" and "Broadcast Zone" -- that don't
match newegg.com/gamerzone's own copy) is now all 8 real zones, sourced by fetching
`newegg.com/gamerzone` directly (via Claude in Chrome, since it's JS-rendered and plain
`web_fetch` returned nothing usable) and copying its real zone names/descriptions verbatim
(shortened where needed): PC Gaming Zone, Immersive Zone (renamed from "Racing & Immersive"),
VR & Mixed Reality Zone, Console Gaming Zone, Broadcast Command Zone (renamed from "Broadcast
Zone"), Shoutcaster & Commentary Zone, Social Gathering Zone, and Presentation Zone -- the last
three are genuinely new cards. `zone-stack.js`'s expanding-grid carousel needed zero code
changes for this -- it already computes item count and column layout dynamically rather than
assuming a fixed number, confirmed by reading the full file before touching any markup.

Photos for the 3 new zones, per Eric's own hints ("the photo of the bar for social," "any
photos of the broadcast zone for the shoutcaster and commentary," "the photo of the TV with
shoutcasters... for presentation"): a subagent searched `PhotoReel` visually (not by filename)
for matching candidates, which I then personally re-verified and refined via direct `Read`
inspection -- picking cleaner alternates over the subagent's first suggestions in two cases.
Shoutcaster & Commentary Zone and Social Gathering Zone got real, newly-cropped 900x600 photos
(`shoutcaster-bg.jpg`, `social-gathering-bg.jpg`, both in `assets/calendar/BGAssets/`). **No
real photo was found for Presentation Zone** despite a genuine look (Eric's "TV with
shoutcasters" hint pointed at the same photo already used for Broadcast Command Zone, not a
distinct one) -- per the no-fabrication rule, it uses the site's existing honest icon-only
fallback pattern (`.zone-grid-art-empty`, already established for a previous Arcade-photo gap)
rather than a mismatched or duplicated photo.

**Home -- Featured Gear: renamed and pricing removed.** "Gear We Feature" -> "Featured Gear"
(`<h2>` only). All 14 `GEAR` entries in `featured-gear.js` had their `price` field removed, and
`cardHTML()` no longer renders a price line -- cards now show only image, name, spec line, and
the "View on Newegg" link, per Eric's direct instruction (prices go stale against Newegg's live
price, and Eric didn't want the upkeep). `.gear-item-price`'s CSS rule was deleted outright;
`.gear-item-spec` gained `margin-bottom:.7rem` in its place so spacing above the button doesn't
collapse now that the price line is gone.

**Games -- "Arcade" renamed to "Arcade Station" (visitor-facing only).** The internal
`PLATFORMS` key stays `arcade` (per Eric's own "don't change internal keys unless required"),
but every visible label changed: `PLATFORMS[].label`, the `#games-cat-grid` card `<h3>`, and
critically the **hardcoded** filter chip `<span>` in `games.html` -- this chip's text is not
generated from `PLATFORMS.label` the way the panel heading is, so both had to be edited
separately or the visible chip would have kept reading "Arcade" while everything else changed.

**Games -- Jackbox Party Pack 4/6/7 handling.** Per the requirement to remove Jackbox titles
from the PC list (they're not PC-exclusive, and Arcade Station already carries most of them):
4 and 6 were simply removed from PC (Arcade Station already lists both). Party Pack 7 was
PC-only with no Arcade Station counterpart, so removing it from PC per the instruction would
have deleted it from the site outright -- flagged to Eric via `AskUserQuestion`, who chose
"move it to Arcade Station" over dropping it. Implemented exactly that: removed from PC,
added to Arcade Station's own list with a comment explaining the move.

**Games -- Discord CTA replaced with a direct email link.** The old "request a game" CTA
pointed at the site's Discord; per Eric's direct instruction this is now a plain
`mailto:gamerzone@newegg.com` line ("Don't see your favorite? Email us at
gamerzone@newegg.com."). This is a request-a-title contact channel, not general community
chat, so it doesn't touch the footer's separate, unrelated Discord icon link.

**Games -- Street Fighter 6 DLC merged into its own list entry.** The site used to carry a
separate, standalone "Street Fighter DLC (1-4)" row alongside the real "Street Fighter 6" row
-- two rows for one game. A new `GAME_NOTE` lookup (`{'Street Fighter 6': 'DLC Years 1–4
Available'}`) attaches the note directly to the real game's own row instead, reusing
`itemLine()`'s existing dim-sublabel rendering (previously VR-only, generalized to fall back to
`GAME_NOTE` for any non-VR title) rather than adding a second, parallel rendering path -- one
shared mechanism for "a game with a small qualifying note," per this file's own "one shared
implementation" discipline.

**Games -- VR list fully reorganized by real platform (Steam VR vs. Meta Quest).** The 12 real
VR titles at the Zone are now each labeled with their actual platform via a rebuilt
`VR_SYSTEM` lookup: Kill It With Fire VR, Among Us 3D: VR, Beat Saber, The Elder Scrolls V:
Skyrim VR, VRChat, and Doctor Who: The Edge of Time are Steam VR; Arizona Sunshine VR 2, The
Thrill of the Fight 2, Batman: Arkham Shadow, Fruit Ninja, and Teenage Mutant Ninja Turtles:
Empire City are Meta Quest; Population One -- the one title genuinely on both platforms -- is
listed once with a combined "Steam VR & Meta Quest" label rather than appearing twice.
"Dumb Ways to Die VR" (not a real title at the Zone per Eric's list) was removed.

**Games -- Nintendo Switch additions.** "Mario Kart" renamed in place to "Mario Kart 8" (same
row, not a new/duplicate entry), plus two real additions: Super Mario Wonder and Splatoon
Raiders.

**Academy -- XP League image swapped a second time, from the logo mark to a real action
photo.** Per Eric, directly comparing the shipped logo against "the current image of the
child" and calling it unnatural/distorted, with a clear fallback order: (1) authentic in-house
Gamer Zone/XP League photography if it exists, (2) another real photo from XP League's own
Irvine page. A targeted, actually-look-at-them search of this repo's own event photography
found no authentic in-house XP League photo, so per Eric's own fallback order this pulled from
`xpleague.com/california-irvine/` again: a real, unedited photo of two people at an XP League
Finals event, one wearing a real "DOOM / IRVINE, CA" XP League competitor jersey, shaking hands
and celebrating with crowd/stage lighting visible behind them -- genuinely natural, not
AI-generated or distorted. Two other real candidates from the same page were checked and
passed over: a promotional web banner with marketing text baked into the image pixels
(unusable as a clean photo), and a plain "Sportsmanship" icon graphic (not a photo at all).
Self-hosted as `assets/img/XPLeague/xpleague-action.jpg` (same `net::ERR_BLOCKED_BY_ORB`
hotlinking reason as every prior XP League image on this page). The 2026-09-17 logo file
(`xpleague-logo.png`) stays on disk, unreferenced.

**Cache-bust bump:** `?v=91` -> `?v=92` across all 6 shared-convention HTML files, since
`style.css`, `assets/js/games.js`, and `assets/js/featured-gear.js` all changed this round.

**Verification.** Full scripted QA suite: console/error smoke test (0 errors, 5 pages),
container-width check (0 findings, 5 pages), and the pixel-verified contrast audit (986 text
items across 5 pages) -- 24 failures, all in the same already-documented "horizontally-scrolled
Featured Gear card past the initial viewport" false-positive category (see "Readability"
above), re-confirmed this round via a live Puppeteer check of a flagged button's real computed
`background-image` (the standard, already-AAA-verified `.btn` gradient, not the 1.04:1 the
audit's background-only screenshot sampled). Live element screenshots (not full-page crops)
confirmed: the 8-zone grid renders cleanly with no clipping at desktop (3-col), tablet (2-col),
and mobile (2-col, scrolled into view); the Arcade Station panel shows Street Fighter 6 with
its DLC note attached and no separate DLC row; the VR panel shows all 12 titles with correct
per-title platform labels and Population One appearing exactly once; the Consoles panel shows
"Mario Kart 8," "Super Mario Wonder," and "Splatoon Raiders"; the filter chip reads "Arcade
Station"; the mailto link's real `href` is `mailto:gamerzone@newegg.com`; Featured Gear cards
render with zero `.gear-item-price` elements; and the Academy XP League photo renders as a
real, natural, unedited action photo.

## Weekly lineup activity pulse: "who's here," reframed around real event data (2026-09-16)

Roadmap #8 ("who's here" pulse) was originally scoped as a live check-in count ("14 people
checked in today") built from real SENET/Verkada data. Investigating this round found **no
such live or even daily-refreshed data actually exists anywhere in this repo**: `data/
config.json`'s `verkadaUrl` (see `docs/06-VERKADA.md`) is a static year-long guest
sign-in link with no API feed, not a data source, and the SENET numbers on the Games page are
hand-refreshed by Eric from an export (see `senet-chart.js`'s own header comment), not a live
pull. Building the original framing would have meant fabricating a number -- a real core rule
4 violation, not a hypothetical one -- so per Eric's own call it's reframed instead around data
the site already has and computes honestly.

**Implementation.** `#eu-week-pulse` (`index.html`, right under the "Weekly lineup" `<h2>`,
Home page only -- not `events.html`, which already shows the full slate in detail immediately
below its own copy of that heading, so a summary line there would just repeat what's on
screen) is populated by `event-update.js`, reading the **exact same `weekAll` array** that
already builds the board below it (`weekAll.filter(e => e.type !== 'closed').length`) rather
than a second, independently-derived count that could drift from what's actually on the board.
Renders as "`<b>N</b> real event(s) happening at the Zone this week`" with a small pulsing
orange dot (`.eu-pulse-dot`, reusing the exact `cal-dot-pulse` keyframe the Plan Your Visit
calendar's `.cal-dot` already established -- one shared pulsing-dot animation, not a second
near-identical one). **A genuinely quiet week (0 real events) removes the whole element
outright** rather than showing a deflating "0 events" line -- the same disappear-rather-than-
lie pattern `.hero-status` already uses when `hoursSchedule` is missing (see "Live open/closed
status" below).

**If real live check-in data ever becomes available** (Verkada API access, an admin portal,
etc.), the *original* "who's here, right now" framing is still the better long-term version of
this idea -- this reframed event-count version is an honest stand-in given what's actually
buildable today, not a final replacement.

## Ghost button retirement: `.btn.ghost` is gone (2026-09-16)

Per Eric, closing out the last open piece of Phase 4's Ambassador-page-polish audit item (the
"secondary-button styling pass," flagged as still-open in the Reviews-round entry above): the
transparent, bordered `.btn.ghost` style put the shared `gz-shine` sweep (`.btn::after`, see
"Unified metallic shine" below) on a mostly-see-through background, where the flash read as
disproportionately intense -- **the exact same problem the Esports Training button on
`edu.html` was pulled off ghost for back on 2026-09-04** (see that round's own history), but
that one-off fix was never generalized, so every ghost button added since (all three Ambassador
track CTAs, added 2026-09-15) still had it.

**Fix: retire `.btn.ghost` entirely rather than give it a second, toned-down shine treatment**
(a second near-duplicate effect would contradict the "one shared implementation" rule this
project already holds `gz-shine` to). Every former ghost CTA is now a plain solid `.btn`,
matching Esports Training's own precedent instead of contradicting it: `ambassador.html`'s
three "Apply as Collegiate/Influencer/Organization Ambassador" buttons, `featured-gear.js`'s
14 "View on Newegg" links, `index.html`'s "Shop All Gaming Gear on Newegg," and
`gz-referrals.html`'s (an internal, `noindex` admin tool) "Reload saved" button. The `.btn.
ghost` CSS rule itself is removed, with a comment at its old location explaining why and
pointing to this section for any future component that genuinely needs a lower-emphasis
secondary action -- the right fix there is designing it to specifically exclude `.btn::after`'s
shine selector, not resurrecting `.ghost` as-is.

## RGB picker discoverability swatch (Phase 5, 2026-09-16)

Per Eric's go-ahead on the last open item from the design-audit follow-through (Part 4 #9,
Phase 5): the hero's RGB lighting picker (`#hero-lighting-select`) was a plain, unstyled
`<select>` with nothing signaling it's a real customization feature rather than decorative
text.

**Fix:** a small circular swatch (`#hero-lighting-swatch`, `techno-hero.js`) sits next to the
select, filled with the selected profile's own real representative hue -- reusing the *exact
same* base-hue values `colorState()` already computes for that profile (`static`:205,
`breathe`:28, `flame`:24, `wave`:200, `meteor`:195, `city`:210, `pulse`:342, `rapidpulse`:178,
`multipulse`:200), not a second, independently-guessed color that could drift from what the
tunnel actually renders. Updated once on page load and once per real `change` event -- **not
every animation frame**, per this file's own "don't force a layout recalculation every frame"
rule (a style write is cheap, but there's no reason to do it 60x/sec for a value that only
changes on user input). `cycle` is the one profile whose hue never settles on a single value
(it animates continuously), so it gets an honest rainbow `conic-gradient` (`.is-cycle` in
`style.css`) instead of a fixed color that would misrepresent it. The swatch's glow ring reads
`currentColor` (set alongside `background` from the same one real color value) so the fill and
glow can never drift out of sync with each other.

Verified via a live Puppeteer check: a real `page.select()` interaction (not a manual property
set) correctly updates the swatch's background/glow, and the selection plus swatch color both
correctly persist through a full page reload (the existing `localStorage`-backed
`loadProfile()`/`saveProfile()` mechanism, unchanged).

## Shine dimmed, RGB profiles pushed further + spread apart (2026-09-16)

Per Eric, right after the RGB picker swatch above: "make the shine effect less intense, make
the RGB patterns more intense, so they are each unique." Two independent tuning passes, both
direct instructions (not open-ended design questions) so implemented straight through per core
rule 15, then verified with real pixel sampling rather than eyeballed.

**Shine, less intense.** `gz-shine`'s `@keyframes` (see "Unified metallic shine" above) had its
peak `opacity` dropped from a fully-opaque `1` to `0.5` — the sweep is now a dimmer, half-
strength flash rather than a full white-out. The hard 3.5%-wide core and the 60s cadence (both
separate, earlier explicit specs from Eric) were left untouched — only the one lever the request
actually asked for moved. Re-verified against the full pixel-verified contrast audit afterward
since this sits directly behind real button/card text: 915 text items across all 5 pages, 0
failures.

**RGB profiles, more intense and more distinct from each other.** Two separate problems existed
before this round: several profiles' base hues clustered within ~15deg of each other in the same
blue/cyan band (`static`=205, `wave`'s base=200, `meteor`=195, `multipulse`'s first channel=200),
and every profile's brightness amplitude was tuned in the 2026-09-04 "push the RGB effects" round
using values that read as comparatively tame once judged against Eric's new "more intense" bar.
Fixed both in `techno-hero.js`'s `colorState()`:

- **Hue reassignment**, keeping each profile's own thematic logic (Breathe stays warm, Flame
  stays red-orange, Pulse stays pink, etc.) but spreading the 9 named profiles' base hues out
  across the wheel instead of letting several sit in the same narrow band: `static` 205->220,
  `breathe` 28->45, `flame`'s wander-center 18->10, `wave`'s base 200->150, `meteor` 195->265,
  `multipulse` channel 1 200->95. `city` (already a genuinely multi-hue profile via `CITY_SEEDS`)
  and `pulse`/`rapidpulse` (342/178, already well-separated) were left alone.
- **Amplitude raised across every profile's own `ringAlpha`/`breatheMul` math** (roughly +25-40%
  per profile, baseline dimmed slightly at the same time so the *range* between resting and peak
  brightness grew, not just the peak) — see each `case` in `colorState()` for the exact before/
  after numbers, left in the switch statement's own comments.
- **The shared rendering pipeline itself pushed further too** (`drawRing()`'s brightness-driven
  saturation/lightness/glow scaling, raised again on top of the 2026-09-04 pass's own increase) —
  this affects every profile at once since they all funnel through the same draw call, consistent
  with the "one shared implementation" rule.
- `SWATCH_HUE` (the RGB-picker discoverability swatch added earlier this same day, see above) was
  updated in lockstep with the real `colorState()` hues it mirrors, so the swatch never shows a
  color the tunnel doesn't actually render.

**Verified with real pixel sampling, not eyeballing.** A live Puppeteer script sampled the
`#techno-canvas` element's actual rendered pixel data (not a screenshot guess) across each
profile for several real seconds post-load-fade-in: `pulse`/`rapidpulse` (the fastest-cycling
profiles) showed a genuine min/max brightness swing of roughly 15-70 out of 255 per channel-sum
sample, and `meteor`/`city` (the punchiest profiles) peaked at 148/116 respectively — confirming
the amplitude increases are real, not just numbers that look bigger on paper. Separately,
because a brighter tunnel sits directly behind the hero's white `<h1>` text, real WCAG contrast
was computed from actual rendered pixels (not assumed): captured the tunnel at its brightest
sampled moment for `meteor`, `city`, and `rapidpulse`, then re-screenshotted the exact same hero
title region with text forced transparent (the same "hide the text, sample the real background"
method the site-wide contrast audit already uses) and computed contrast against the h1's real
white text color. Worst observed case (`city`, a stray bright-orange pixel from a twinkling
light passing directly behind the title) was **7.71:1** — still clearing the 7:1 AAA floor with
real room to spare, thanks to the h1's existing heavy `text-shadow` treatment (`.hs-line.solid`,
a near-opaque black shadow already tuned for exactly this kind of dynamic background); `meteor`
and `rapidpulse` came in around 16-20:1. The full scripted QA suite was also re-run clean (915
text items / 5 pages / 0 contrast failures, 0 container-width findings, 0 console errors) since
`gz-shine`'s change reaches every `.btn` site-wide.

## Seven direct fixes: marquee controls, hero boundary, weekly pulse removal, Zone Stack polish, Featured Gear carousel, Reviews tags (2026-09-16)

Per Eric, in one round of direct, fully-specified feedback (not open design questions — implemented straight through per core rule 15):

**Marquee controls grouped into one cluster.** `.gz-marquee-controls` used `justify-content:space-between`, pinning the prev/next skip buttons to the lane's far left/right edges independent of the play/pause button sitting alone in the center — three controls that read as three separate placements. Changed to `justify-content:center` with a `.9rem` gap so all three sit together as one control unit. Same 3 buttons, same DOM order, same click behavior — purely a positioning change.

**Homepage hero boundary removed.** The plain gradient div (`.hero-boundary`, a `linear-gradient(180deg,transparent,var(--bg))` sitting between the hero and Weekly Lineup — see "Hero-to-Weekly-Lineup boundary" above for its 2026-09-15 history) read as a visible dark edge/border rather than a seamless fade. Removed entirely — both the `<div class="hero-boundary">` in `index.html` and its CSS rule. Nothing replaces it; the hero and Weekly Lineup now sit directly adjacent, relying on `applyTechFade()` (`main.js`, unchanged) to dim the tunnel's opacity over this scroll range.

**Weekly activity pulse line removed.** The "`N` real events happening at the Zone this week" line shipped earlier the same day (see "Weekly lineup activity pulse" above) read as too technical/backend-sounding per Eric's direct call. Removed outright — `#eu-week-pulse`/`#eu-week-pulse-text` markup in `index.html`, the whole computation block in `event-update.js` (the `weekAll`-derived real-event count and its disappear-on-zero handling), and `.eu-week-pulse`/`.eu-pulse-dot`'s CSS (the shared `cal-dot-pulse` keyframe itself is untouched — `.cal-dot` on the Plan Your Visit calendar still uses it). This fully reverts that feature; roadmap item #8 is reopened rather than left marked shipped (see the roadmap doc).

**Zone Stack: native image drag-ghost removed, peek cards hidden.** Two related but distinct fixes to `assets/js/zone-stack.js`'s carousel (see "Site-wide interaction upgrade round" above for the original drag build): (1) a plain `<img>` is natively draggable in every browser, so dragging across `.zone-card-art img` during the custom pointer-based swipe fought the site's own gesture with the browser's built-in "drag this image out" ghost/highlight — fixed with `-webkit-user-drag:none`/`user-select:none` on the image and the whole `.zone-card`, which doesn't touch the real Pointer-Events-based swipe at all. (2) Per Eric ("I don't know if I like the half faded side cards, maybe we can adjust so those edge ones aren't shown"): the near and far peek layers' blur+brightness treatment is now hidden outright (`opacity:0;pointer-events:none`) rather than shown dimmed — only the centered card is visible. Position/transform math for both peek layers is left in place (not deleted), so this is a one-line revert if the fully-hidden look doesn't land either. **Disclosed tradeoff, flagged rather than silently absorbed:** this reopens the "full section width" reasoning the far-peek layer was originally built to satisfy (see that layer's own comment in `style.css`) — `.zone-stack`'s outer width/edge-mask are unchanged, so the section still occupies its full container width, it now just has visibly empty space on either side of the center card instead of a composed multi-card scene filling it. Worth a fresh look if the section reads too narrow again per the container-width rule.

**Featured Gear rebuilt as a single-row, arrow + drag carousel.** Per Eric ("make it only one row tall and just add the left and right controls on the outside of the section to be able to cycle through, and also allow me to mouse drag that area as well"): the `GZ.marquee()`-based static wrapping-grid (4 rows of 14 cards, shipped 2026-09-15 to fix a click-blocking overlay — see "Featured Gear cards" above) is replaced entirely with a dedicated single-row carousel, **not** built on `GZ.marquee()` at all this time (`assets/js/featured-gear.js`, `.gear-carousel`/`.gear-carousel-track`/`.gear-carousel-arrow` in `style.css`). It's a real native `overflow-x:auto` scroll container — not a transform-driven fake one — so keyboard/trackpad/wheel scrolling and every card's own "View on Newegg" link keep their normal Tab stops for free; the two arrow buttons (flanking the row, inside the section's own container — no new width system) step it by one real card-width via `scrollBy()`, dimming (`.is-end`, not disabling, so focus/Tab order stays intact) once there's nothing further to scroll to, and a real pointer-drag sets `scrollLeft` directly while held, reusing the same `dragMoved`-suppresses-the-next-click pattern `zone-stack.js` already established so releasing a drag on top of a link doesn't also fire that link's click. `.gear-item`/`.gear-item-img img` also get the same native-drag-ghost fix as Zone Stack above. Verified via simulated Puppeteer input (a real arrow click advanced `scrollLeft`; a real mouse-down-move-up sequence dragged it; a real link's `href` and click behavior were unaffected by a non-dragging click) — not just checked for the absence of console errors, per core rule 7. **A known audit false positive, disclosed rather than silently ignored:** the pixel-verified contrast audit flags 10 "View on Newegg" buttons at 1.04:1 after this change — these are real cards laid out past the container's initial scroll position (x-coordinates beyond the 1400px viewport), which a full-page screenshot never actually paints (browsers don't render content past a scrollport's visible area), so the audit's background-only pass samples blank page background instead of the button's real gradient. Manually verified the real computed style of one of these flagged buttons after scrolling it into view: `linear-gradient(145deg, rgb(250,157,40), rgb(224,124,0))` — the exact same, already-AAA-verified `.btn` gradient every other button on the site uses, confirming this is a tooling limitation with horizontally-scrollable content, not a real regression. This is a new entry in the "known false-positive category" family documented under "Readability" above (different root cause than the load-transition one already there — a future session hardening `collect.js` should scroll every horizontal-overflow container into view before its background-sampling pass, the way it already does a vertical scroll-through for `.reveal` fades).

**Reviews: 4 more real recurring tags, including "Good Vibes."** Per Eric ("add a Good vibes tab or more fun tags for the reviews as well"): `reviews.js`'s `HIGHLIGHT_TERMS` (see "Reviews section: real-content word emphasis" above) gained `chill` → "Good Vibes" (covers 4 real reviews' "chill out and play"/"chill day of gaming"/"chill/clean atmosphere" phrasing — deliberately its own tag rather than merged into the existing `vibe` → "Great Vibe" entry, since it's genuinely different wording), `welcoming` → "Feels Welcoming", `beautiful` → "Beautiful Space", and `friendly` → "Super Friendly" (placed last/broadest — the existing `used`-containment guard already stops it from ever stealing a match that the more specific `kid friendly` term should win instead, so no change was needed to the matching logic itself, just where the new term sits in the list). Same sourcing discipline as the original list: every term is a phrase actually present, more than once, across the real 62-review pool — nothing invented.

**Verification for this whole round:** full scripted QA suite (905 text items / 5 pages, 0 container-width findings, 0 console errors, the 10 disclosed Featured Gear false-positive contrast findings above and nothing else), live Puppeteer-simulated input for both new/changed interactive pieces (Featured Gear's arrows/drag, Zone Stack's hidden-opacity peek cards), and mobile/tablet/desktop screenshots confirming no clipping or overlap from the Featured Gear carousel's arrows at any width (a tight-but-non-overlapping ~5.6px gap at 390px, confirmed via real computed `getBoundingClientRect()` values, not just eyeballing the screenshot).

## Live open/closed status ("no fabrication," applied to a time-sensitive claim)

`GZ.openStatus(cfg)` in `assets/js/main.js`, added 2026-08-28 for the homepage hero's `.hero-status` line, is the reference example for what core rule 4 ("never fabricate a specific fact") looks like applied to something that changes by the minute rather than something static. It computes real open/closed state from `data/config.json`'s `hoursSchedule` (structured days/open/close/timeZone, added alongside the existing plain-text `hours` string so both stay in sync from one source rather than drifting), evaluated in the **venue's** timezone (`America/Los_Angeles`), not the visitor's — a visitor in a different timezone should see whether Diamond Bar is actually open right now, not a status computed against their own local clock. If `hoursSchedule` is ever missing, `.hero-status` removes itself entirely rather than showing nothing-in-particular or a stale guess. Any future "right now" claim on the site (a live queue length, a "X spots left" count, anything time- or state-sensitive) should follow this same pattern: compute it for real from real data at render time, and have it disappear rather than lie if that data isn't available.

## Diamond tier "flare" system (Ambassador cards)

`assets/js/ambassador.js` has `pickDiamondFlare()` — a deterministic, rarity-weighted picker for the Diamond-tier color variants defined in `assets/css/style.css` (`[data-flare="..."]` rules on `.host-card.tier-diamond`). It is not wired to anything live; the current example cards have `data-flare` set by hand. When the Ambassador event-log backend (roadmap #1 in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md`) exists and can identify who has actually reached Diamond, call this picker with a stable per-ambassador id to assign their flare — do not hand-assign flares to real ambassadors, and never use `crimson` more often than its 1% weight implies.

## Testing interactive features (calendar and anything like it)

**2026-09-03: the hero mini-game is gone.** Per Eric's call (working through the `scenes-not-specs.html` external audit's F-02), the old "Hero Runner" playable game in `assets/js/techno-hero.js` — a character dodging hazards around the tunnel's morphing ground shape — was removed entirely rather than made more discoverable; it had become a bigger source of brand dissonance than the discoverability problem it originally had. `techno-hero.js` is now purely the decorative morphing tunnel background, plus a new, non-game feature: a selectable RGB-lighting-style color profile (Cycle/Static/Breathe/Flame/Wave/Meteor/City Lights/Heartbeat/Rapid Pulse/Multi-Pulse — the last three added 2026-09-10, see this file's "Site-wide interaction upgrade round" section) for the tunnel's hue, via a plain `<select>` (`#hero-lighting-select` in `index.html`), persisted in `localStorage`. Any reference elsewhere in this file or the roadmap doc to "the hero mini-game" predates this change.

Checking for the absence of console errors is not the same as verifying a game or interactive widget actually feels functional, and isn't sufficient on its own. When testing anything playable or operable (the Plan-Your-Visit calendar in `assets/js/calendar.js`, the hero lighting picker, or any future one), actually drive it: simulate the real input sequence (keydown/keyup over time, not just a single dispatched event, or held-key movement, not a single tap), let it run for several real seconds, and confirm the loop/interaction behaves as intended — a select's value actually changes and persists, focus moves to the right element, nothing freezes or drifts — rather than only confirming it initializes without throwing.

## Keyboard accessibility

Any custom interactive widget (not a plain link/button, which get this for free) needs to actually be operable without a mouse — this was a real gap on the calendar (`.cal-cell`) until 2026-08-26: click/hover only, no way to even Tab to a day. Going forward:

- Every custom interactive element needs a sensible `tabindex`, `role`, and `aria-label`/`aria-labelledby`.
- Grid/list widgets use a **roving tabindex** (exactly one item is a Tab stop at a time — the currently-relevant or last-interacted one) rather than making every single item individually tab-stoppable, which turns a 30-cell calendar into a 30-tab slog.
- Arrow keys navigate within a grid/list the way a user would expect (Left/Right = adjacent item, Up/Down = a row/week away where that makes sense); Enter/Space activates, matching native button behavior.
- A visible focus ring (`:focus-visible`, not a bare browser default that may be invisible against a dark theme) is required on anything focusable — check it's actually visible against this site's dark backgrounds, not just present in the CSS.

## Touch target sizing (F-14, WCAG 2.5.5)

Settled 2026-09-08: every real, standalone tappable control (icon buttons, nav links, footer link rows, calendar cells/nav, form controls) should clear a **44x44 CSS px** tap target at mobile widths — the original audit flagged 21 targets site-wide as small as 9x9px. This does **not** apply to inline text links inside a sentence of prose (a WCAG 2.5.5-recognized exception) — those stay their natural text size.

Two different fix patterns, chosen per element based on whether the visible control should also grow:

- **Invisible tap-zone pad, visible element stays (mostly) the same size.** For a small icon/dot that's deliberately minimal by design (`.zone-stack-dot`, `.pin-close`), add `position:relative` to the element and a `content:"";position:absolute;top:50%;left:50%;width:44px;height:44px;transform:translate(-50%,-50%)` `::before` — this grows the real clickable area without inflating the visual. Where the current size reads as *illegibly* small (not just "smaller than the tap-target spec"), also bump the visible size a little at the same time (`.zone-stack-dot` 9px→11px, `.pin-close` 26px→32px) — per Eric, generous tap zones don't need to make the visible icon match 1:1, but it shouldn't stay so small it's hard to even see.
- **Grow the real element directly.** For anything already close to 44px (`.gz-mq-btn`, `.zone-stack-arrow`, `.cal-top button` — all 38-40px), or where the "control" IS a block of text/padding anyway (`.ftr-link` row padding, `nav.main-nav a` padding, `.hero-lighting select` padding, `.pin-btn` padding), just grow the box. At these sizes the difference is imperceptible; there's no separate "visible vs. tap zone" distinction worth making.

**One honest exception: `.cal-cell` (the Plan Your Visit calendar's day grid) only reaches ~41.7x41.7px, not the full 44px**, at a 390px viewport — real math, not an oversight: the grid only has ~311px of width to split across 7 columns once `.cal`'s own (deliberately-tuned, untouched) padding is subtracted, and even reducing `.cal-grid`'s gap to 4px on mobile (from 8px) only gets cells to ~41.7px. Full 44px would require either cramming `.cal`'s padding or widening the grid past the shared container width, both bigger tradeoffs than this fix justifies. 41.7px clears WCAG's AA floor (24px) with real room to spare; it's flagged here rather than silently claimed as fully resolved, per core rule 4.

**Verification tooling**: `tools/audit/touch-targets.js` walks all 5 pages at mobile/tablet/desktop and flags every real control under 44x44 (skipping `sr-only` labels and `tabindex="-1"`/`aria-disabled="true"` placeholder icons, and correctly reading a `::before` pseudo-element's box as the real tap zone when one is used instead of the element's own visible size). `tools/audit/touch-target-context-shots.js` grabs in-context mobile screenshots of specific elements for eyeballing size decisions before landing on exact numbers. Both follow the same server-in-one-script pattern as `run.sh` (see its own header comment) — run `bash tools/audit/setup.sh` once, then e.g. `BASE_URL=http://127.0.0.1:8821/ node tools/audit/touch-targets.js` inside a script that also starts the local server in the same shell.

## Standing terminology: "Preregister," not "Register"

Settled 2026-09-08, after the site drifted into using both words for the exact same action (fill out the visitor form/waiver ahead of a visit to skip the line at check-in). The floating pin-node CTA on every page said "Register Now" while the "Plan your next visit" card, the whole `events.html` registration-explainer section, and its own aria-labels all said "Preregister" — two names for one action is exactly the kind of inconsistency a first-timer (Grace, in the Part 3 personas) trips on, wondering if they're different things.

**"Preregister" is the standard, site-wide term** — it's the more accurate one: the action is optional and happens *before* arrival, ahead of at-the-door check-in/registration (a real, separate second step described in "How Registration Works"), and "Register" alone risks sounding like account creation, which conflicts with the site's own explicit "no account required" promise. All five `.pin-btn` floating buttons (`Register<br>Now` → `Preregister<br>Now`, aria-labels updated too) were brought in line with the body copy that already used it. Don't reintroduce "Register" for this specific action in new copy — "Register for workshops" (edu.html) is a different, correctly-named action (claiming an Academy cohort seat, not a venue check-in shortcut) and is unaffected by this rule.

## No fabrication of facts

Never invent a specific date, statistic, quote, or capability that isn't confirmed real, even to fill an awkward content gap. If the real answer is "we don't have that yet" (a next-cohort date, a live data pipeline, admin-portal access), say so honestly and offer a real, working alternative instead — a waitlist/contact link, an honest "not yet scheduled," a roadmap note — rather than a plausible-looking placeholder that could get mistaken for real information later. This applies to marketing copy, example data, and roadmap claims alike.

## Soft goals: wowed, seen, and accepted

The hard rules above (readability, sizing, keyboard access) are the floor — a change can pass every one of them and still feel cold, generic, or unwelcoming. This site's actual job is emotional as much as functional: a visitor should come away feeling **wowed** (this place has real production value and energy), **seen** (this speaks to someone like *me*, specifically), and **accepted** (I'm genuinely invited in, not just tolerated). Treat these as design requirements, not polish — the same way a missing focus ring is a bug, a page that makes a first-timer feel like an outsider is a bug.

**Wowed** — production value and a little delight, without needing to say a word about it:
- The gamified layer (the tier ladder, the Diamond shine, the morphing background and its customizable RGB lighting) is the site's main "wow" lever — keep it sharp (see "Unified shine" and "Container & sizing" above) rather than letting it decay into something merely functional. (The hero mini-game itself was removed 2026-09-03 — see "Testing interactive features" above — so it's no longer part of this list.)
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

**1a. Customer-facing copy read-through — added 2026-09-08, per Eric.** Any time a session touches visible page copy (not just adds new copy — a QA pass on existing pages counts too), actually read every customer-facing string touched or nearby and ask "would a first-time visitor understand this, and does it still describe something real?" Two failure modes to watch for, both real bugs caught this way: (a) internal/technical phrasing that leaks implementation details a visitor doesn't need and wouldn't parse ("auto-cycles every minute" was live copy describing the Zone Stack carousel's old timer — meaningless and slightly off-putting to a visitor, and it went stale the moment the timer was removed); (b) copy describing a behavior that no longer matches what the component actually does after an unrelated change. Grep alone doesn't catch this — a phrase can be perfectly normal English and still be wrong for a customer-facing gaming lounge site. Read the copy the way a visitor would, not the way a developer would.

**2. Readability check — mandatory on every content update and page change, not just visual passes.** Run the full pixel-verified contrast audit (see "Mandatory: run the pixel-verified contrast audit on every passover" under "Readability" above) — real DOM text-node walk + rendered-pixel background sampling, not a CSS-value read-through. Check contrast at rest AND at any animated effect's most intense moment (force the effect to that state and screenshot it). Target WCAG AAA (7:1 normal text, 4.5:1 large text; 3:1 for non-text UI elements, which have no AAA tier). A grep-based check already missed a real failure once (`.reg-step-num`) — treat that as proof this step can't be skipped or shortcut.

**3. Container/sizing check.** For anything touching layout, sizing, or responsive behavior: screenshot at mobile (~390–400px), tablet (~768–820px), and desktop (~1280–1400px+). Check for clipping, overflow, and content that's too long/short for the new layout — not just the example content used while building it. Also check it against the page around it: does the new/changed section's width and side padding match the shared `.container`/`--safe-x` system, or did it quietly invent its own — either shrink-wrapped tight to its content or stretched wider than everything else on the page?

**4. Interactive/functional check.** For anything touching a game, form, calendar, or other widget: actually operate it via simulated real input (held keys, sequences over multiple seconds, keyboard-only operation) and confirm the *behavior*, not just the absence of thrown errors. Check the browser console for errors and warnings regardless (excluding known-harmless `file://` CORS noise during local testing).

**5. Cross-page smoke test.** Before pushing to `main`, load every page that could plausibly be affected (when in doubt, all of them: `index.html`, `events.html`, `games.html`, `ambassador.html`, `edu.html`) and confirm no new console errors — `node tools/audit/console-check.js` (or the full `run-full-qa.sh`) automates this.

**6. Roadmap alignment check.** Did this session's work touch anything on the Part 4 roadmap? If so, update that entry. Did anything come up that should become a new roadmap item? Write it in, don't leave it only in chat.

**7. Soft-goals gut-check.** Reread the actual change as if you were one or more of the personas in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` Part 3 — would this specific persona come away feeling more wowed, seen, or accepted, or is it neutral-to-worse for them? For any new visitor-facing page or section, name which persona(s) it's speaking to; if you can't name one, that's a sign the content is too generic. For any new gamified/flourish element, confirm it doesn't come at the cost of clarity for someone unfamiliar with gaming shorthand. This check should point to something concrete and checkable (a specific line added, a specific example diversified) — not just a feeling.

**8. Documentation check.** If this session established a new standing rule (not just a one-off fix), add it to this file *in the same session* — a rule that only exists in a chat transcript doesn't survive to the next session.

**9. Git hygiene before pushing.** `git status`/`git diff` review of everything staged — confirm nothing unintended is included, commit messages describe the actual change (not just "fixes"), and `git fetch`/rebase against `origin/main` before pushing in case anything else landed there since the session started (an automated `chore:` commit landing mid-session is a real, observed case here). Anything genuinely uncertain gets flagged to Eric rather than pushed silently.

## Marquee click-zone redesign + universal drag + Zone Stack 3-card layout + tag/CTA/photo-band cleanup (2026-09-16, round 2)

Per Eric, in one round of 8 direct, mostly fully-specified requests (implemented straight through per core rule 15; the one genuinely open piece -- the WCAG question below -- got a real answer, not a stall):

**Marquee interaction rebuilt around click zones, no visible chrome.** Per Eric ("we don't even need to show controls anymore, clicking in the center area pauses and plays it, and clicking towards the left and right sections will scroll through instead") plus a real bug report ("I can't hover them since the hover controls are overriding"): the 2026-09-08 hover-reveal dark-scrim overlay (`.gz-marquee-controls`) is gone. That overlay's full-lane `pointer-events:auto` on hover is exactly what was blocking Reviews' own `data-full` click-to-read-more popup -- removing it fixes the reported bug directly, not just by dimming it further.

*The WCAG 2.2.2/2.4.7 question, answered for real:* 2.2.2 ("Pause, Stop, Hide") requires a real, operable pause mechanism for auto-moving content -- it does not require that mechanism to be permanently visible chrome. But a control a keyboard user can tab onto and never see would separately fail 2.4.7 ("Focus Visible"), and this file's own core rule 8 requires a visible focus state on every custom interactive element -- so "no controls" can't mean "no controls, for anyone, ever." The fix: 3 real `<button>`s (prev/play-pause/next, `.gz-mq-btn` in style.css) stay in the DOM, invisible at rest (`opacity:0`), and are revealed with a real focus ring the instant a keyboard user tabs onto one (`:focus-visible`) -- fully operable and visible to the one input method with no other way to discover them, zero chrome for a mouse user who doesn't need it. Mouse/touch users get the same 3 actions via event delegation on the container (`GZ.buildMarqueeControls` in main.js): a click is routed by x-position (left third = previous, center third = play/pause, right third = next) unless it lands on a real button, link, or `[data-full]` element, which is left completely alone -- deliberately delegation, not a second overlay, since an overlay-in-front-of-cards is the exact shape of bug this rewrite fixes, so it can't be reintroduced in a new form. A manual pause is now a sticky toggle (no more "resets on mouseleave" -- there's no more hover state driving anything), matching Eric's literal "clicking... pauses and plays it" spec.

**Universal marquee drag, one shared implementation (`GZ.enableMarqueeDrag` in main.js).** Per Eric ("allow me to mouse/finger drag every section that has scrolling content"): every `GZ.marquee()` lane, animated or static, is now pointer-draggable. Animated lanes (Reviews' two rows, the Past Events waterfall, the hero photo strip) have no native `scrollLeft` to grab, so a drag moves the shared Web Animations API clock directly (`Animation.currentTime`) -- the same mechanism `skip()` already uses. The screen-direction math is a real "grab and drag" convention (content follows the pointer), verified to require a sign flip for `.rev`-direction lanes (row2's reverse-scrolling row) since `animation-direction:reverse` maps the same `currentTime` change to the opposite on-screen motion -- checked via live Puppeteer drag simulation on both a forward and a reverse lane, not assumed from the CSS. Static/reduced-motion lanes (a real `overflow-x:auto` container) just get their real `scrollLeft` dragged, the same pattern `featured-gear.js`'s carousel already established. Either mode suppresses the drag-release's synthetic click for one tick so a real drag doesn't also fire a skip/pause.

**Hero photo strip edge fade widened again** (`.gz-marquee`'s shared mask, 16%/84% -> 9%/91%) per Eric ("fade out closer to the ideal section width") -- reaches every `.gz-marquee` consumer site-wide (hero-proof, Reviews, Past Events), same as the last two times this value moved.

**Zone Stack: drag clamped, 3-card layout restored (reversing last round's full-hide).** `zone-stack.js`'s `onPointerMove` now clamps `--zs-drag` to `±stack.getBoundingClientRect().width` (Eric: "don't let me drag so far that we are past the section width") -- verified via a real 1470px drag attempt on a 1069.6px-wide stack landing at exactly -1069.6px, not just reasoned about. Per Eric ("at least show three... make the cards a little shorter and wider so three cards can fit the section width, with the side cards slightly hiding behind the center card"), reversing the previous round's full-hide: `.zone-stack` height dropped 560/500(mobile)px -> 420/360px, `.zone-card` width grew `min(340px,78%)` -> `min(460px,60%)` (shorter + wider, as asked), and the near-peek offset dropped from 82% to 72% of the card's own (now-wider) width so the combined 3-card span lands within a few px of the section's real container width while the peek cards visibly tuck about 28% of their own width behind the center card. The exact pre-existing `blur(2.5px) brightness(.8)` depth-of-field treatment (removed in the prior round) is back for the visible peek cards.

**Featured Gear CTA renamed + relinked.** "Shop All Gaming Gear on Newegg" (`href="newegg.com/gamerzone"`) -> "Shop Newegg" (`href="newegg.com"`), per Eric's exact instruction.

**Reviews tags curated down to a smaller, more professional set.** Per Eric ("just use 100 percent free, free snacks, clean space, friendly staff, good vibes, fun, whatever else you think is clear but professional"): `HIGHLIGHT_TERMS` in `reviews.js` consolidated `chill`+`vibe` into one "Good Vibes" label (dropping the separate "Great Vibe") and `staff`+`friendly` into one "Friendly Staff" label (dropping "Great Staff"/"Super Friendly"), and added `fun` -> "Fun" (confirmed as a real, frequently-recurring word across the actual review pool, not guessed) placed last/lowest-priority since it's the broadest term in the list. Every other retained term (VR Setups, Raffles & Prizes, Giveaways, Hidden Gem, Family Friendly, Tournaments, Immersive Setup, Feels Welcoming, Beautiful Space, Weekly Events, Free to Play) is kept under Eric's own "whatever else is a good categorical fit" discretion -- still real, still verified against the actual REVIEWS pool from the original round, just judged as already professional enough to keep.

**Ambassador teaser cards: higher background opacity.** Per Eric ("make the background behind collegiate, influencer, and organization have higher opacity so it blocks background better"): `.amb-class-teaser-card`'s own fill (sitting on top of `#amb-teaser`'s photo band) raised from `rgba(4,5,7,.5)` to `.82`, in line with this project's other photo-backed scrim treatments.

**Photo bands: real staff/event photos from a newly-found folder.** Eric pointed at "a new thing called NeweggGZ folder in the photo reel" -- the actual folder found in the repo is `assets/calendar/BGAssets/PhotoReel/EmployeeGZ/` (78 real, dated 9/12/25 event photos; no folder literally named "NeweggGZ" exists, and this is very likely what Eric meant). Per this project's own hard-learned lesson against filename-only photo searches, every candidate was actually opened and looked at (via generated contact sheets, not just filenames) before picking two: `visit-band.jpg` is now a real over-the-shoulder photo of a guest at a racing-sim rig (an "empty"/ambient environmental shot, no one facing camera), and `ambassador-band.jpg` is a real photo of a visitor holding a Newegg-branded goodie bag with a thumbs-up next to the venue's own circular Newegg wall icon -- genuine Newegg branding and enthusiasm, a good thematic fit for the Ambassador section. **Disclosed, not a regression:** neither photo is a literal "empty room" or a staff member in uniform (this folder's real content is candid guest/event photography, not staff headshots or vacant-room shots) -- picked as the closest honest match to "empty or staff" per Eric's own two named options. Both new source photos measure similarly dark (mean luminance ~42-55/255) to the photos they replaced (~49-57/255), so the already-established `.84/.92/.95` scrim (see "Photo bands," 2026-09-15, above) renders them just as moodily dark as before -- confirmed a real, recognizable photo (RGB gaming rig glow, visible detail) still sits underneath by brightening a screenshot 4x, not just by re-reading the CSS.

**Verification for this whole round:** full scripted QA suite (931 text items / 5 pages, 0 container-width findings, 0 console errors; 10 disclosed pre-existing Featured Gear horizontal-overflow false-positive contrast findings and nothing new -- see "Featured Gear rebuilt" above for that category), live Puppeteer verification of every interactive change (marquee center-click toggling play/pause on a non-card lane, left/right-zone clicks correctly calling skip(-1)/skip(1) with the skip-in-flight guard respected, a real pointer drag changing `Animation.currentTime` on both a forward and reverse lane, keyboard `:focus-visible` actually revealing a marquee button's opacity, the Zone Stack drag clamp holding at exactly the stack's own width on a 1470px overshoot attempt), and mobile (390px)/desktop (1400px) screenshots of the redesigned Zone Stack, Featured Gear CTA, both photo bands, and the Reviews cards confirming no clipping, no stray visible marquee chrome, and the photo bands' real (if dark) photography.

## Round 3, same day: single-word tags, Zone Stack clipping fix (supersedes round 2's numbers), RGB cursor + color wheel (2026-09-16)

Per Eric, in a follow-up round right after round 2 above -- three items, the first two direct corrections to round 2's own work, the third a new feature:

**Reviews tags shortened to one word each, superseding round 2's multi-word labels.** Per Eric ("Try to keep the tags like one word, so VR setups is just VR"): every `HIGHLIGHT_TERMS` label in `reviews.js` was renamed to a single word -- "VR Setups" -> "VR", "Raffles & Prizes" -> "Raffles", "Hidden Gem" -> "Gem", "Family Friendly" -> "Family", "Immersive Setup" -> "Immersive", "Feels Welcoming" -> "Welcoming", "Beautiful Space" -> "Beautiful", "Friendly Staff" -> "Staff", "Weekly Events" -> "Events", "Free to Play" -> "Free", "Good Vibes" -> "Vibes". The matching *phrases* (the array's first element in each pair, e.g. `'kid friendly'`, `'free snacks'`) are unchanged -- only the rendered label text moved. Round 2's own entry above (see "Reviews tags curated down...") now describes stale multi-word labels; this section is the correction of record.

**Zone Stack card clipping fixed, superseding round 2's 460px/60%/72% numbers.** Per Eric's direct bug report ("I should at least be able to see 3 cards fully. They are cut off in the outermost edges"): round 2's sizing (`min(460px,60%)` width, 72% peek offset) produced a real 3-card span (~1122px) wider than `.zone-stack`'s actual rendered width (~1069.6px) at the viewport it was tuned against -- genuinely clipped by the section's own `overflow:hidden`, not a false alarm. Root cause: round 2 picked numbers that worked at one viewport rather than deriving a formula that holds at every width. Fixed with real proportional math: since both the card's width-percentage and the peek offset-percentage scale with the container, the 3-card span as a fraction of container width is `PCT * (1 + 2*OFFSET)` regardless of viewport -- this must stay comfortably under 1. New values: `.zone-card` width `min(380px,36%)` (was `min(460px,60%)`), peek offset `70%` (was `72%`) -- `0.36 * (1 + 2*0.70) = 0.864`, leaving a real ~8.6-9.1% margin per side. Verified via live `getBoundingClientRect()` measurements at 390/768/1400px (not just one viewport this time) showing consistent margin and zero clipping at every width, plus visual screenshots at all three. This is a real fix to round 2's own approach, not just a number tweak -- a future sizing change to this component should keep deriving from this same formula rather than picking a viewport-specific value again.

**RGB cursor + color-wheel picker (new feature).** Per Eric's direct, fully-specified request: "Lets do a mouse that copies the hero's own rgb hue. Let users who click on the rgb color be able to change it to various colors in a simplistic color wheel, and it's cached accordingly." Two independent pieces, both in the new `assets/js/rgb-cursor.js`:

- **A cursor glow trail** (`.gz-cursor-glow` in style.css) that mirrors the hero tunnel's real live hue. `techno-hero.js`'s `frame()` function now writes the current frame's real hue to `window.GZ_HERO_HUE` every frame (a plain number write, not a DOM/style write, so it costs nothing extra per the "don't force layout every frame" rule) -- `rgb-cursor.js` reads that same value rather than deriving a second, independently-guessed color, per the project's "one shared implementation" discipline. The glow is `pointer-events:none` so it can never intercept a real click (the exact class of bug this project has hit and fixed before with hover overlays -- see "Featured Gear cards," 2026-09-15). Skipped entirely on coarse-pointer/touch devices (no real cursor to mirror) and under `prefers-reduced-motion` (a pure decorative motion effect gets the same opt-out every other transform-driven effect on this site already respects) -- the OS cursor itself is never hidden, this is purely an additive glow.
- **A color-wheel popover** for overriding the cursor's color, opened by clicking `#hero-lighting-swatch` -- the only visible "rgb color" indicator already on the page, so it's the one Eric's own wording points at. That element changed from a decorative `aria-hidden` `<span>` to a real `<button>` (keyboard-reachable and focus-visible for free), but its *original* job -- echoing the selected lighting profile's hue, driven entirely by `techno-hero.js` -- is unchanged; the popover it now also opens is a separate, independent preference (the cursor glow's own color). The popover reuses the site's one existing `.modal-bg`/`.modal` component (the same one the Ambassador application form uses) rather than inventing a second floating-panel look. The wheel itself is a real `conic-gradient` rainbow disc, deliberately "simplistic" per Eric's own word -- angle-only, ignoring radius -- using the exact same rainbow stops (red/yellow/lime/cyan/blue/magenta) the Cycle-profile swatch already uses, so `conic-gradient(from 0deg, ...)`'s clockwise-from-top angle maps 1:1 to HSL hue with no separate conversion table. A paired `<input type="range" min="0" max="359">` is what makes this genuinely keyboard-operable per core rule 8 -- a mouse-drag-only wheel would fail a keyboard-only visitor entirely -- and stays in sync with the wheel's knob position in both directions. A "Match hero color" button resets to auto-mirroring. The choice is cached the same way every other RGB preference on this site already is: `localStorage['gzCursorHue']`, `'auto'` or a `'0'`-`'359'` string, try/catch-wrapped exactly like `techno-hero.js`'s own `RGB_KEY` pattern.

**Verified via live Puppeteer, not just reasoning about the code:** the glow trail actually follows real `pointermove` events and its rendered `background-color` changes to match a hand-set hue; clicking the swatch opens the modal; dragging the range input to 90 moves the knob to the mathematically correct position (`--kx:64px`, `--ky:~0px`) and persists `localStorage['gzCursorHue']='90'` immediately; the value survives a real page reload; the "Match hero color" button resets it back to `'auto'`; keyboard-only operation works end to end (Tab to the swatch button, a real visible `:focus-visible` outline in `var(--ne-orange)`, native Enter-activates-button behavior opens the modal with zero custom keydown code needed, and ArrowRight on the focused range input steps the hue) -- confirming core rule 8 is met without any bespoke keyboard-handling code, since a real `<button>` and a real `<input type="range">` already provide it. Zero console errors. A 390px mobile screenshot of the open popover confirms the wheel and controls fit without clipping.

**Verification for this whole round:** full scripted QA suite re-run after all three changes (905 text items / 5 pages, 0 container-width findings, 0 console errors; the same 10 disclosed pre-existing Featured Gear horizontal-overflow false positives from the prior round and nothing new).

## Round 4, same day: grid-color rework, real light-trail cursor, hero-proof width, Zone Stack -> expanding grid, Broadcast/Demo Zone (2026-09-16/17)

Per Eric, one more follow-up round after round 3 above -- nine items from a single message, all direct/fully-specified per core rule 15:

**Grid-color popover repositioned and retargeted, cursor now has zero color state of its own.** Round 3's popover already anchored left of the swatch and already drove `window.GZ_HERO.setCustomHue()` to recolor the tunnel's real grid lines/rings (not a separate cursor-only color) -- re-reading round 3's own entry above against this round's request confirmed the architecture was already correct, so no further rework was needed here; `rgb-cursor.js`'s trail reads the same live `window.GZ_HERO_HUE` `techno-hero.js` writes every frame, one source of truth, unchanged from round 3.

**Real light-trail cursor effect, replacing the round-3 glow dot.** Per Eric ("don't make it just a faint glow, make it an actual light trail effect instead"): `rgb-cursor.js`'s single glow-gradient dot was replaced with a real canvas-based comet-tail (`.gz-cursor-trail`, a fixed full-viewport `<canvas>`). Each frame first fades the previous frame via `globalCompositeOperation:'destination-out'` + a low-alpha black fill (erasing a fraction of prior opacity rather than clearing outright -- this is what turns a static dot into a real trailing streak), then draws a fresh radial-gradient dot at the current pointer position with `globalCompositeOperation:'lighter'` (additive blending, so overlapping trail segments glow brighter where the cursor lingers or moves slowly) tinted with the live `window.GZ_HERO_HUE`. Still `pointer-events:none`, still skipped on coarse-pointer/touch and under `prefers-reduced-motion`, same as round 3's dot.

**Clean-load performance check.** Re-ran the full scripted QA suite (contrast/width/console) plus a fresh-profile Puppeteer load of `index.html` with cache disabled -- no new console errors or warnings, no long-task stalls attributable to this round's changes (the canvas trail only allocates and starts its RAF loop once, on script load, matching the existing "expensive work once, not every frame" discipline this file already documents elsewhere). The `assets/calendar/LineupAssets/*.png` optimization below was the concrete performance action taken this round, not a separate perf feature.

**Hero photo reel constrained to the shared container width.** Per Eric ("make the hero page photo reel the same width as the sections below, so it is not as wide"): `.hero-proof-wrap` gained `max-width:1140px;margin-left:auto;margin-right:auto;padding:0 var(--safe-x);box-sizing:border-box` -- the same `.container`/`--safe-x` system every other section already uses (see "One shared container width" above), replacing what had been a full `.hero-stage`-width bleed. Verified via screenshot (`hero-proof-width.png`) that the photo strip now lines up edge-to-edge with the stat-card row above it, not wider.

**Hero photo reel drag, confirmed already shipped.** Per Eric ("allow me to click and drag to move the photos through the reel, so no more just plain left and right arrow controls"): checking `main.js`'s `GZ.enableMarqueeDrag()` (built in the 2026-09-16 "Marquee click-zone redesign" round, see above) confirmed every `GZ.marquee()` lane -- including the hero photo strip -- already got real pointer-drag support in that round, moving the shared Web Animations API clock (`Animation.currentTime`) directly rather than a fake scroll. No new code needed here; this request was already satisfied by existing work, re-verified rather than re-built.

**Zone Stack rebuilt as an expanding grid carousel (Watermelon UI "Minimal Carousel" pattern), replacing the peek-card swipe carousel entirely.** Per Eric's link to `https://ui.watermelon.sh/animated-components/category/carousel` (which 302-redirected to the homepage -- the real page, found by grepping the site's own `sitemap.xml`, is `/animated-components/minimal-carousel`): a grid of thumbnails where clicking one promotes it into a large featured card at top with the rest compacting into a row beneath, animated with a smooth layout transition. That reference is React/framer-motion; this site is vanilla JS, so the same interaction is reproduced with real CSS Grid (`.zone-grid-item.is-featured{grid-column:1/-1;order:-1}` -- grid auto-placement respects `order` the same way flexbox does) plus a classic FLIP animation (`assets/js/zone-stack.js`, fully rewritten) since CSS alone can't transition a discrete property like `order`/`grid-column`. Keyboard support carries over the same roving-tabindex + arrow-key-grid-navigation pattern the old carousel and the calendar grid already use (Left/Right/Up/Down move by column count, Home/End jump to the first/last item, Enter/Space via native `<button>` behavior). Old `.zone-stack`/`.zone-card`/`[data-pos]`/nav-arrow/dot CSS (~200 lines, several rounds of accumulated history) was deleted outright rather than left dead. Verified via live screenshots at mobile/tablet/desktop (`zonegrid-mobile.png`/`-tablet.png`/`-desktop.png`) confirming the grid -- not some other section -- renders correctly with no clipping at any width, and via reading the rewritten `zone-stack.js` end-to-end to confirm a mid-draft redundant double click-handler (a harmless no-op, not a shipped bug) was cleaned up before finalizing.

**Broadcast renamed to "Broadcast Zone."** Per Eric's exact instruction: the zone card's `<h3>` text updated in the new grid markup; no other Broadcast references needed changing.

**Sixth zone added: Demo Zone, at the Bar.** Per Eric ("Add a 6th area for the Bar and call it Demo Zone -- Display PCs and Hardware are usually shown here"): a real zone card added as Zone 6, description "Located at the Bar, this is where display PCs and hardware are usually shown off -- the latest builds and components on hand to see and try up close." **No real photo exists for this location** -- searched `assets/calendar/BGAssets/PhotoReel` by filename for bar/demo/hardware/display and found nothing real (only an unrelated "Diamond Bar High School" false-positive match). Per the no-fabrication rule and the existing Games-page Arcade-card precedent (`.game-cat-art-empty`), this card is honest icon-only (`chip` icon from the shared `GZ_ICONS` set) rather than a mismatched or invented photo.

**LineupAssets PNG optimization (a real, disclosed performance action, not part of Eric's 9 items but folded into this round's clean-load check).** 8 oversized decorative weekly-icon PNGs in `assets/calendar/LineupAssets/` were resized (max 1080px longest dimension via `PIL.Image.LANCZOS`) and losslessly re-optimized (`optimize=True`) since `pngquant`/`cwebp`/`optipng` aren't installable in this sandbox (no root access). Before/after: `FortniteChest.png` 1895KB->1241KB, `FortnitePinataAsset.png` 2253KB->909KB, `GZTest2.png` 1909KB->805KB, `MarioKarty.png` 2089KB->837KB (the currently-active Sep 15-19 Racing Games Week icon, confirmed still rendering correctly post-resize via a live screenshot), `Riotv1.png` 1415KB->947KB, `us-flag-metallic.png` 2106KB->696KB, `FortnitePickaxeAsset.png` 689KB->454KB; `FortniteCrownAsset.png` was already small (217KB) and left unchanged. This isn't as aggressive as `pngquant`'s lossy palette quantization would achieve, but it's a real, safe improvement within this sandbox's tool constraints, and every one of these is a real rotating weekly asset (not a one-off), so fixing the whole folder rather than only the currently-active file was worth doing.

**Stale copy fix caught during this round's read-through (core rule 1a):** `#hero-lighting-swatch`'s `aria-label` still read "Customize cursor color" from round 3, even though the popover's actual job (round 3 onward) is recoloring the grid lines, with the cursor trail only ever mirroring whatever's already showing. Updated to "Customize grid line color."

**Verified via real screenshots, not just code review:** `zonegrid-mobile.png`/`-tablet.png`/`-desktop.png` (the grid renders correctly, no clipping, Demo Zone's icon-only card displays cleanly), `popover-desktop.png`/`popover-mobile.png` (the panel sits cleanly left of the swatch at desktop and correctly falls back to below-right at mobile without running off-screen), `hero-proof-width.png` (the photo reel now visually matches the stat-card row's width above it). Full scripted QA suite re-run clean after this round (contrast/width/console -- no new findings beyond the already-disclosed pre-existing Featured Gear horizontal-overflow false positives). Cache-bust bumped `?v=89` -> `?v=90` across all 11 tags in `index.html` since `techno-hero.js`, `rgb-cursor.js`, `style.css`, and `zone-stack.js` all changed further this round.

## Round 5, next day: Zone grid width/revert bugs, water-ripple cursor (replacing the light-trail), Games/Ambassador/Academy content reworks, 40px header spacing (2026-09-17)

Per Eric, a batch of ~21 items from a single message, all direct/fully-specified per core rule 15 (one item -- the water-ripple-vs-alternative choice -- was confirmed via AskUserQuestion since it was a genuine design pick, not a fully-specified instruction):

**Marquee controls simplified to one small always-visible bar under each reel, replacing the invisible click-zone convention.** Per Eric ("I think it would be easier to remove the invisible controls and just have a very small play pause, left and right control underneath each photo reel"): `GZ.buildMarqueeControls()` (`main.js`) no longer relies on the Round-4 "invisible until focused, click-zone-routed" convention -- it now builds one real, always-visible `.gz-marquee-bar` (prev/play-pause/next) as a sibling directly below the lane, identical markup for every `GZ.marquee()` instance site-wide (Past Events, hero-proof, Academy/Ambassador galleries, Reviews, Featured Gear), so nothing sits on top of the cards and every reel's controls look and behave the same. This also drops the earlier version's WCAG 2.2.2/2.4.7 judgment call entirely -- real, labeled, always-visible buttons with a normal `:focus-visible` ring need no "invisible until tabbed onto" reasoning.

**Featured Gear moved back onto `GZ.marquee()` as a real autoscrolling reel.** Per Eric ("make Gear We Feature an autoscrolling shopping reel with the controls center aligned underneath"): the manual single-row `overflow-x` strip with its own bespoke arrow/drag code (built two rounds ago specifically to dodge the old hover-overlay click-blocking bug) is gone -- now that the hover overlay itself no longer exists (removed in the marquee-bar rewrite above) and drag lives in the shared `GZ.enableMarqueeDrag()` (which already skips real links/buttons on pointerdown), Featured Gear reuses the exact same shared lane/controls every other reel uses instead of its own one-off implementation.

**Reviews consolidated from two opposing-direction lanes to one**, per Eric ("make the reviews a single scrolling reel so that there needs to be only one set of controls on it") -- one `GZ.marquee()` lane instead of two, one control bar instead of two, same 24-of-62-reviews shuffle-once pool as before. Hover-to-preview-full-review on review cards was also restored (`main.js`'s `initFullTextTooltips`), reversing an earlier "no hover effect" request per Eric's direct "on hover should show the full review" call.

**Nav pill gained a persistent current-page marker, separate from the hover/focus preview.** Per Eric ("keep a lighter orange selection there on what page we are currently on, so hovering other nav areas still keeps a marker on what we selected"): a second, static ring (`.nav-pill-current`) is now pinned to the real active link and never moves on hover/focus -- the original bright `.nav-pill` still slides to preview whatever's hovered/focused, exactly as before, it just no longer doubles as the only "you are here" signal. The active link's own text swaps from black (readable sitting on the solid pill) to the site's orange (`.pill-away`) the instant the bright pill previews somewhere else, so the text never reads black-on-nothing.

**Small copy/markup fixes:** the Plan Your Visit calendar's today's-preregister button and the events.html PREREGISTER button both gained a shared `.prereg-btn` class to fix a font mismatch between them; the calendar's "reservations are one per visitor" copy corrected to "preregistrations," matching the site's standing Preregister-not-Register terminology rule; `events.html`'s "Past Events" tab renamed to "Past Community Events"; the footer's Academy link removed and Feedback moved from Discover to the Reviews column (both footer changes applied across all 6 shared-convention pages); a margin added between the Featured Gear section's subtitle and its content.

**Two real bugs fixed in the Round-4 zone grid, found and fixed via live measurement, not reasoning from CSS on paper.** (1) Selecting "Console Gaming" visibly shrank the whole `#zone-grid` section -- confirmed via `getBoundingClientRect()` that the grid measured 948.8px wide featuring Console vs. 1069.6px featuring PC, a real, content-length-dependent sizing bug, not a visual illusion. Root cause: `.zone-stack-wrap`'s `align-items:center` (a flex property on the grid's flex parent) prevented the grid child from stretching to the parent's full width, so CSS Grid's `1fr` shrink-to-fit algorithm sized the row off whichever content happened to be featured. Fixed with `align-items:stretch` on `.zone-stack-wrap`. (2) Clicking off the expanded featured card never reverted the grid to its original per-zone order -- a real missing-behavior bug, not a hypothetical one, fixed in `zone-stack.js`'s click-outside handler.

**Water-ripple cursor effect, replacing Round 4's light-trail canvas -- confirmed via AskUserQuestion ("water ripple on the shapes" over an ASCII-trail alternative).** `techno-hero.js`'s existing procedural ring geometry (the tunnel's own morphing shapes) now gets a real physically-motivated displacement applied per-point inside `drawRing()`: concentric sine-wave offset (`sin(distance*FREQ - age*PHASE_SPEED)`) combined with exponential distance decay (`Math.exp(-dist/REACH)`) and power-based age decay, so a ripple spawns at the real pointer position, expands outward, and fades to exactly zero rather than looping or leaving a residue. Ripples spawn from real `pointermove` (throttled by distance/time) and `pointerdown` events, capped at `MAX_RIPPLES=24`. `rgb-cursor.js`'s entire prior canvas-based comet-tail implementation (the Round-4 light-trail) was deleted outright rather than layered underneath -- one cursor effect, not two competing ones, consistent with the "one shared implementation" discipline this file already holds other effects to. Verified via a purpose-built `window.GZ_HERO_RIPPLE_COUNT` debug counter (a plain number write per frame, same "cheap enough to always run" precedent as `window.GZ_HERO_HUE`) confirming the full spawn -> peak -> zero lifecycle, since the tunnel's own constant ambient motion made plain visual screenshot-diffing inconclusive on its own.

**Header-to-content spacing reduced to a real, measured 40px site-wide.** First attempt (bumping `.container`'s padding-top from 20px to 40px) moved the gap the wrong direction -- caught via live re-measurement showing ~60-68px, not 40px -- and was reverted. Fixed instead with a new, narrowly-scoped `main.container > section:first-child { margin-top: 20px }` rule (specificity (0,2,2), beats the existing general `section`/`body:not(.home-page) section` rules without `!important`), which stacks additively with `.container`'s own unchanged 20px padding-top (a child's margin does not collapse with a nonzero parent padding) for a real, verified 40px gap on every page at every viewport.

**Games page:** reordered so Top Played Games comes before Browse by Zone (both still sit above the full game list); added WARDOGS and Minecraft to the PC list, and Dragon Ball FighterZ plus a TMNT Shredder's Revenge / Jackbox Party Pack 4-6 block to Arcade (noting Jackbox 4/6 also already exist under PC -- a deliberate addition, not a move).

**Ambassador page:** "How it works" rewritten from prose into a short bulleted list; the Collegiate track's description shortened (no em dash, per house style); tier pillars' `.rank-badge` and attendance bonus `.sg-badge` decluttered by removing the icon-over-blurred-photo `::before`/`::after` treatment, leaving flat tier-colored circles with icons only -- directly addressing Eric's "emojis on top of images... too messy" call; `.amb-type` cards switched to a flex column with `margin-top:auto` on the CTA button (the same bottom-anchoring pattern already used on Featured Gear cards) so all three "Apply as X" buttons align across cards regardless of description length.

**Academy (`edu.html`) reworked:** section order changed to Photo Reel (renamed from a school-specific gallery to "Past Academy Events," alt text generalized to drop specific school names) -> Why Learn -> Workshop Tracks -> XP League (moved last); "Schools & groups" and "Want to teach here?" sections removed outright; the XP League card gained a real outbound link to `https://xpleague.com/california-irvine/` and a real photo (`assets/img/XPLeague/xpleague-banner.jpg`, downloaded and self-hosted after the direct-linked source URL threw `net::ERR_BLOCKED_BY_ORB` in real Chromium -- confirmed via a live Puppeteer `requestfailed` listener despite a plain `curl` fetch of the same URL succeeding, so self-hosting rather than hotlinking was the fix, consistent with this project's existing "self-host real photos" convention). A first candidate photo (a tiny `Logo.png` icon fragment) was rejected after actually opening and looking at it, not just confirming it loaded.

**Site-wide cache-bust bump, `?v=88`/`?v=90` -> `?v=91`** across all 6 shared-convention HTML files (`index.html`, `events.html`, `games.html`, `edu.html`, `ambassador.html`, `screenshot-monthly-calendar.html`), since `style.css`, `main.js`, `techno-hero.js`, `rgb-cursor.js`, `zone-stack.js`, and `games.js` all changed this round. `gz-referrals.html` is intentionally excluded (its own independent internal-tool versioning track, per existing convention).

**A third contrast-audit false-positive category, found this round (see "Readability" above for the first two).** A full QA re-run flagged one new finding beyond the already-disclosed Featured Gear horizontal-overflow set: `[index.html] "...Super friendly staff..." <P class="review-quote"> 2.71:1`, apparently white text on a bright orange background. Live-verified via direct computed style rather than trusted at face value: the card's real background is `rgb(14,16,19)` (near-black) with white text -- over 15:1, nowhere near a failure. Root cause: this card lives inside `.gz-marquee-track`, a *continuously animating* (never-paused-by-default) lane -- `collect.js` takes its "normal" and "text-hidden" screenshots several hundred ms apart (real DOM-walk + skip-link-focus wait time in between), and during that gap the marquee keeps moving, so the background-only screenshot samples a *different, since-scrolled-in* card's orange `.rv-tag` pill at the same screen coordinate instead of the original card's own real background. This is a new, third root cause in the same false-positive family as the two already documented (load/transition-gated elements; horizontal-overflow content never painted) -- distinct because here the content **is** on-screen and eventually settled, it's just that the two screenshot passes disagree about *when*. **When a fresh audit flags a review card or any other element inside a continuously-running (non-static) marquee lane, verify with a live computed-style/background check before treating it as real** -- don't assume it's fixed by pausing the marquee for the *whole* audit, since that would mask genuine failures on cards that never move at all. A future hardening of `collect.js` could pause every `Animation` on the page before its screenshot passes; not done this round without Eric's go-ahead per core rule 15.

**Verification for this round:** full scripted QA suite (996 text items / 5 pages, 0 container-width findings, 0 console errors; 25 disclosed Featured Gear horizontal-overflow false positives plus the 1 new disclosed marquee-timing false positive above, both confirmed via live computed-style checks, nothing else), live `getBoundingClientRect()` measurements proving both zone-grid bugs and their fixes, a live Puppeteer ripple-lifecycle check via the `GZ_HERO_RIPPLE_COUNT` debug counter, and mobile/tablet/desktop screenshots of the reworked Games/Ambassador/Academy pages confirming no clipping from the section reorders.

## Round 6, same day: Zone grid expand-in-place, hero copy/photo-reel tweaks, tier/bonus badge redesign, 2-up example Ambassador cards, simplified color wheel (2026-09-18)

Per Eric, eight direct, fully-specified requests in one message, implemented straight through per core rule 15:

**Zone grid: featured card expands in place, no more jump-to-front.** Per Eric's bug report ("when I click on browse by Zone, it shouldn't kick me down, just hold the same position"): `.zone-grid-item.is-featured` used to also carry `order:-1`, pulling whichever card was clicked to the very front of the grid (top-left) regardless of where it actually sat -- so clicking, say, Zone 5 visually launched it up to Zone 1's old spot and reshuffled everything around it, a jarring reset rather than an in-place expand. `order:-1` is removed outright; a card now grows to full width right where it already sits in DOM/source order (CSS Grid's auto-placement just wraps the next item onto a new row beneath it), so every card *before* the clicked one never moves at all. Verified live: clicking Zone 5 (`items[4]`) leaves `featuredIndex === 4` (previously would have snapped to 0) and a real before/after screenshot shows Zones 1-4 completely undisturbed above the now-expanded Zone 5, with only 6-8 shifting down to make room.

**Hero subtitle: "for free!" removed for a clean two-line wrap.** Per Eric: `index.html`'s hero `<p class="lead">` shortened from "...gaming hardware for free!" to "...gaming hardware." -- the sentence already opens with "Newegg's FREE High-End Gaming Lounge," so the trailing "for free!" was both redundant and, per Eric's own framing, was pushing the line count in a way that read poorly; removing it lets the sentence settle into two clean lines.

**Hero photo reel: back to full-bleed width.** Reverses the 2026-09-16 round-4 change that capped `.hero-proof-wrap` to the shared `.container`/1140px width "so it's not as wide" -- per Eric now: "make the hero photo reel stretch all the way across again, so users see more images." `.hero-proof-wrap` drops `max-width:1140px` and its auto side-margins, going back to filling `.hero-stage`'s own full 100vw bleed (the `width:100%;min-width:0` fix from 2026-09-08, which stops the marquee track's un-clipped duplicated content from blowing out the flex item's width, is untouched and still needed regardless of which width convention is active). Verified via a live `boundingBox()` check showing the reel's real rendered width now matches the full 1400px viewport, not a narrower centered column.

**Ambassador "How it works" shortened further**, from 5 bullets (already trimmed once, 2026-09-17) down to 2: one covering apply/host-at-your-pace/tiers-and-bonuses, one covering where each track hosts. Same real facts, no information dropped -- just consolidated.

**Ambassador tier pillars redesigned: equal height, no icons, horizontal "N Events Hosted" tag.** Per Eric ("change silver gold platinum and diamond to just the same card height, make it cleaner... make 1 Event Hosted a horizontal tag rather than a square... remove the icons entirely"): the four tiers' staggered per-tier `min-height` (420/505/545/585px, an intentional "growing pillar" effect from the 2026-09-15 redesign) is gone in favor of one shared `.tier-pillars .mile{min-height:460px}` floor and grid's default `align-items:stretch`, so all four columns read as one even row instead of an escalating staircase. The `.rank-badge` icon circle (shield/coin/chip/trophy, one per tier) is deleted outright -- HTML, CSS, and every per-tier color rule for it -- per Eric's explicit "remove the icons entirely," not just hidden. `.mile-count` (the old fixed 72x72 square showing a stacked number-over-"Hosted" label) is now a horizontal pill: `display:inline-flex;flex-direction:row` with the number and a re-worded "Event Hosted"/"Events Hosted" label sitting side by side, auto-width instead of a forced square.

**Attendance bonus badges redesigned to match: number-forward horizontal tag inside a square.** Per Eric ("emphasize the 20+/40+ etc as the core part in a similar horizontal tag format... similar design to the ambassador journey '1 event hosted' tag style, it should be inside a square"): `.sg-badge` (previously a 60px icon circle) is now a rounded-square container with no icon, holding the existing `.pts`/`.lbl` elements side by side as one horizontal tag ("20+ Attendees") -- the same row-layout pattern as the tier pillar's `.mile-count`, just square-cornered instead of pill-shaped, per Eric's explicit "inside a square." A real contrast regression was caught and fixed during this change: `.lbl`'s color used to inherit each tier's saturated accent color from `.sg-badge`, which read fine against the old bright icon-circle background but dropped to 5.68-6.91:1 (below the 7:1 AAA floor) against the new, larger square's own tinted-dark fill -- fixed by giving `.score-guide .sg .lbl` an explicit `color:var(--ink)` (pure white), re-verified via the pixel-verified contrast audit at a clean 3-for-3 pass afterward.

**Featured Ambassador example cards: always-horizontal, two per row, no CTA.** Per Eric ("just have the horizontal design, no open closing... two columns... remove the apply to become an ambassador from the example cards"): the expand/collapse toggle (`.host-expand-btn`, `.is-expanded`, and the whole `assets/js/ambassador.js` IIFE driving it, built 2026-09-10) is removed entirely -- `.host-card`'s side-by-side photo/bio layout (previously only the *expanded* state) is now simply what the card always looks like, folded into the base rule, with a `@media (max-width:640px)` fallback to a stacked column on phones where there's no room for a real row. The "Apply to become an Ambassador" CTA that only appeared in the old expanded state is gone from these illustrative cards outright. `#host-grid` switched from a single-card-capped `max-width:340px` `.cols-3` grid to `.cols-2` with no width cap, and a second illustrative "Example Ambassador" card (Organization pillar, `data-flare="amethyst"` for visual variety) was added alongside the existing one so the 2-column layout has real content in both slots instead of one card stretching to fill an empty row -- both stay explicitly marked "Example" per the standing F-04 no-fabrication resolution; neither claims to be a real Ambassador.

**Homepage color picker simplified: wheel-only, no slider or reset button.** Per Eric ("not have a hue slider or a match lighting profile button, just have it so I can direct click various values on the wheel... shorter description"): the `<input type="range">` hue slider and the "Match lighting profile" reset button are both removed from `#cursor-modal`'s markup, along with their handlers in `rgb-cursor.js`. Direct click/drag on the wheel (already the primary interaction since this control was built) is now the only way to set a color, and the description text is cut from two sentences to one ("Click the wheel to recolor the background grid lines."). Removing the range input would otherwise have removed the one keyboard-operable path this control had (core rule 8) -- so the wheel itself picked up that job instead: it's now a real `role="slider"` element with `tabindex="0"` and `aria-value*` attributes, and Left/Down/Right/Up arrow keys step its hue by 5deg (Home/End jump to 0/359), verified via a live Puppeteer keyboard-focus-then-arrow-key check (`aria-valuenow` moved 90 -> 95 on a single ArrowRight press) alongside a direct wheel click confirming `hueFromPointer()`'s click-to-pick math still works standalone.

**Verification for this round:** full scripted QA suite (998 text items / 5 pages, 0 container-width findings, 0 console errors; the same already-disclosed Featured Gear horizontal-overflow false positives plus one already-disclosed nav-pill load-transition false positive on `games.html`, both re-confirmed via live computed-style checks against the real settled `.btn`/`.nav-pill` gradient rather than trusted at face value -- see "Readability" above for both false-positive categories), a real contrast regression caught and fixed (attendance-bonus `.lbl` color, see above), live Puppeteer functional checks for every interactive change (zone-grid expand-in-place via `featuredIndex`/before-after screenshots, color-wheel click-to-pick and arrow-key stepping, popover markup confirming no slider/reset element exists), and mobile/tablet/desktop screenshots of the Ambassador page confirming the tier pillars, attendance bonuses, and 2-up example cards all render cleanly with no clipping at any width.

## Round 7 (2026-09-19): design/QA handoff audit + fixes, and About Gamer Zone reverted back to the peek-card stack

A fresh design/QA audit (requested by Eric explicitly to prepare a findings list for the internal design and QA team) surfaced nine real items spanning WCAG, usability, and copy QA -- Eric answered each directly in his next message, and all nine were implemented this round, alongside one unrelated, separately-requested layout revert.

**About Gamer Zone: back to the peek-card stack, Presentation Zone removed.** Per Eric ("the current one is too jarring"): the round-4 "expanding grid" carousel (`.zone-grid`, promoted a clicked card in place -- see that section's own history above) is reverted to the original left/right peek-card "trading card" stack that predates it, restored from `git log assets/js/zone-stack.js` (the last commit before the round-4 rewrite) rather than rebuilt from memory, so the restored version is byte-for-byte the same drag/clamp/3-card-fit logic that shipped and was verified back then -- not a fresh reimplementation that could silently reintroduce an already-fixed bug. Re-applied to the site's current 7 real zones (Zone 8, Presentation Zone, is removed per Eric's own explicit instruction this round -- it never had a real matching photo anyway, see that zone's old icon-only-fallback comment in the round-4 section above); the remaining zones keep their existing names/copy/photos, renumbered 1-7 in their existing order. `.zone-grid`/`.zone-grid-item`/etc. CSS and `zone-stack.js`'s FLIP-carousel logic are removed outright (confirmed via grep that nothing else references them). Verified via live Puppeteer: 7 cards render, clicking "next" correctly advances the centered card, and mobile/tablet/desktop screenshots (`tools/audit/out/zonestack-revert/`) show the restored peek-card layout rendering cleanly with no clipping at any width.

**Ambassador application form: real label/id associations, Formspree endpoint untouched.** Per Eric ("should still be plugged into that form website, but if you want to adjust that form feel free to"): every `<label>` in `#amb-form` now has a real `for`/`id` pair to its own field (`amb-name`, `amb-email`, `amb-track`, etc.) so a screen reader announces the correct field name on focus instead of relying on visual proximity alone. The form's `action="https://formspree.io/f/xrenvwra"` and `method="POST"` are unchanged, per Eric's explicit instruction -- this was a markup-only accessibility fix, not a resubmission-path change.

**Real focus management for both real dialogs on the site.** `#amb-modal` (the Ambassador application) and `#cursor-modal` (the grid-color popover) both had `role="dialog"` but nothing that actually behaved like one: opening either never moved focus inside it, Tab could still reach the page behind it, and closing never returned focus to whatever opened it. Fixed with one new shared helper, `GZ.dialogFocus(dialogEl)` in `main.js` (`open()`/`close()`, focus-trap keydown handler, remembers and restores the triggering element) -- one implementation reused by both `ambassador.js` and `rgb-cursor.js`, per this file's usual "one shared implementation" rule, rather than two independently-written near-duplicates. `#cursor-modal` also gained `aria-modal="true"` to match its new modal-like Tab-trapped behavior. **A real bug caught while verifying this, not assumed from the code:** `rgb-cursor.js`'s first version guarded the call with `window.GZ ? window.GZ.dialogFocus(...) : null`, which silently evaluated to `null` and skipped focus management entirely -- `main.js` declares `const GZ = {...}` at top level, and a top-level `const`/`let` (unlike `var` or a bare assignment) never becomes a `window` property, so `window.GZ` is always `undefined` even though the bare identifier `GZ` is reachable from every later script on the page. Confirmed via a live focus check (Tab never actually reached the popover) before landing on the real fix: use the bare `GZ` identifier, the same way `ambassador.js`'s call already (correctly) did. Re-verified after the fix: opening either dialog moves focus to its first focusable element, 10-15 Tab presses never escape either dialog, and closing `#amb-modal` returns focus to whichever `[data-amb-open]` button opened it.

**Two status regions now actually announce to screen readers.** `#amb-sent`/`#amb-error` (the Ambassador form's submit-outcome messages) and `#cal-detail` (the Plan Your Visit calendar's day-info panel, which swaps its entire `innerHTML` on every click/hover/arrow-key selection) both gained `aria-live="polite"` -- previously a screen reader user got no notification that a submission succeeded/failed, or that a new day's info had loaded, since a plain `style.display`/`innerHTML` swap with no live region announces nothing on its own.

**Mobile nav toggle now exposes its open/closed state.** The checkbox+label "hamburger" hack (`#nav-toggle`) had no `aria-expanded` anywhere -- added in `main.js`, kept in sync on every real `change` event (plus set once on load to match whatever state the page loaded in), with `aria-controls` pointing at `.main-nav`'s id (added if the nav didn't already have one).

**Featured Gear "View on Newegg" buttons enlarged to clear the touch-target floor.** Per Eric ("view on newegg buttons larger"): `.gear-item .btn`'s compact `.5rem/1.1rem` padding + `.8rem` font (which measured 36px tall, under the site's 44px floor -- see the design/QA audit that caught this) is now `.72rem/1.4rem` padding + `.85rem` font, the same vertical padding the base `.btn` uses everywhere else on the site. Re-measured live at mobile width: 44.78px, clearing the floor. The `.gear-item .btn` case in `tools/audit/touch-targets.js`'s findings (84 instances, one per rendered card including the marquee's duplicate set) is now gone entirely from a fresh run.

**Calendar day-detail card: real cycling background images for "major" events.** Per Eric ("in the current Calendar date, use a basic image for the daily free play, and cycling special images for major events"): the daily Free Play background (`FREE_PLAY_BG`, `dailyplay-bg-blurred.jpg`) already existed and needed no change -- it was already exactly "a basic image for the daily free play." What was missing: every `type: 'major'` event used to show the exact same single photo (`majorevent2-bg-blurred.jpg`) no matter which major event it was. `calendar.js` now cycles between two real, purpose-shot "big event" background photos already in `assets/calendar/BGAssets/` (`majorevent2-bg-blurred.jpg` and `tournament-major-bg-blurred.jpg` -- both already used elsewhere on this same page for major/tournament energy, so this reuses real, likeminded assets rather than sourcing new ones) via a small deterministic hash of the event's own date string (`majorBgFor()`) -- picked once per event and always the same on every visit/reload, so nothing flickers and only genuinely different events land on different photos. `tournament`-type events keep their own dedicated `tournament-major-bg-blurred.jpg` unchanged. Verified via live Puppeteer, navigating the real calendar to both of the two real `major`-type dates in `data/events.json` (2026-07-31, 2026-08-22) and confirming each rendered a different real background image, not just reasoned about from the hash math on paper.

**Two copy/QA fixes.** The hero stat row's Google review count (`111 Google Reviews`) was stale against the Reviews section's own count (`112 Google reviews`, bumped 2026-09-18 per `reviews.js`'s own comment) -- both now read 112. The three Ambassador tier cards' "Includes all X benefits" lines were inconsistently phrased (Silver: "...tier benefits, plus:", Gold: "...tiers benefits, plus:" -- a real typo, Platinum: "...benefits, plus" -- missing "tier" and the trailing colon); all three now read "Includes all [Tier] tier benefits, plus:".

**Self-descriptive link text.** The Ambassador form's Formspree-failure fallback message used to read "...<a>click here to send it as an email instead</a>" -- the link text now reads "...<a>send this as an email instead</a>" with "Couldn't submit automatically:" as the surrounding sentence, so the link is self-descriptive out of context (a screen reader user tabbing through a page's links in isolation, a common navigation pattern, now hears what the link actually does).

**One audit finding deliberately left open, per Eric's own call:** the Ambassador form's error-state text color (`#ff6b6b` on `--bg-2`, 6.87:1 -- just under this project's own 7:1 AAA bar, though comfortably clear of WCAG's AA 4.5:1 floor) was flagged and Eric said "its fine" -- left unchanged, noted here so it isn't silently re-flagged as new in a future audit without this context. The phone/address touch-target gap in "Plan your next visit" (flagged in the same audit, ~192x22px, no padding) also wasn't part of Eric's response this round and remains open for a future pass.

**Verification for this round:** full scripted QA suite (987 text items / 5 pages, 0 container-width findings, 0 console errors; 24 already-disclosed Featured Gear horizontal-overflow false positives and nothing new), a fresh `touch-targets.js` run (the 84 Gear-button findings are gone; only the already-disclosed phone/address links and the already-disclosed 41.7px `.cal-cell` exception remain), and live Puppeteer functional checks for every change: Zone Stack card count/advance, both dialogs' focus-in/Tab-trap/focus-return behavior, form label association, nav-toggle `aria-expanded` toggling, and the calendar's major-event background cycling across two real event dates.

## Round 8, same day: remove Shoutcaster & Social Gathering zones, marquee drag now snaps to the next card (2026-09-19)

Per Eric, two direct, fully-specified follow-ups right after Round 7 above:

**About Gamer Zone: down to 5 zones, Shoutcaster & Commentary and Social Gathering removed.** Per Eric ("Remove shoutcaster commentary and the social gathering zone"): the two `.zone-card` blocks for those zones (ZONE 6 and ZONE 7, both added in the 2026-09-18 multi-page round -- see "Home/Games/Academy multi-page update round" above) are deleted outright from `#zone-stack` in `index.html`. This supersedes that round's own "site's current 7 real zones" framing in the Round 7 entry above (which itself superseded the original 8-zone expansion) -- the site is now back to the original 5: PC Gaming Zone, Immersive Zone, VR & Mixed Reality Zone, Console Gaming Zone, Broadcast Command Zone, unrenumbered since the two removed zones were already last in sequence. `zone-stack.js` needed zero code changes -- its `render()`/`goTo()` logic is fully dynamic on `cards.length`, the same reason the earlier Presentation Zone and Demo Zone removals also required no JS edits. Confirmed via grep that no other file (CSS, JS, other HTML pages) references `shoutcaster-bg.jpg`, `social-gathering-bg.jpg`, or either zone's copy -- both photo assets were added specifically for this carousel this same day and are now simply unused on disk, left in place per this project's standing "don't delete real assets speculatively" convention. Verified live: 5 cards render, "next" correctly cycles PC -> Immersive -> VR -> Console over 3 clicks, and mobile/tablet/desktop screenshots show the peek-card layout unchanged in every other respect (dot nav now shows 5 dots instead of 7).

**Marquee/photo-reel drag now snaps onto the nearest full card instead of parking at an arbitrary scrub position.** Per Eric ("when I drag photo reels it should seamlessly and smoothly move onto the next image, so the card stack as I drag should show me the next one after a threshold"): `GZ.enableMarqueeDrag`'s animated-lane branch (`main.js` -- the mechanism behind the hero photo strip, the Past Events waterfall, the Academy/Ambassador galleries, Reviews, and Featured Gear, all built on `GZ.marquee()`) already let a real drag scrub the Web Animations API's `currentTime` continuously and smoothly during the gesture (built 2026-09-16, see "Marquee click-zone redesign + universal drag" above) -- what was missing was any commitment on release: letting go used to just resume normal autoscroll from whatever arbitrary mid-card position the pointer happened to be at, which read as aimless rather than a real "swipe to the next photo" interaction.

Two small shared helpers were factored out in `main.js` to fix this without a bespoke one-off: `GZ.marqueeStepMs(track)` (the "how many ms of animation time is exactly one card" measurement, extracted out of `buildMarqueeControls`'s own former private `stepMs()` so the skip buttons and the new drag-release snap share one measurement instead of two copies that could drift apart -- the skip buttons now just call the shared version) and `GZ.animateMarqueeTo(anim, targetMs, onDone)` (a small `requestAnimationFrame` ease-out tween from wherever `currentTime` currently sits to a target, over 260ms). `enableMarqueeDrag`'s `endDrag()` now computes `Math.round(currentTime / stepMs) * stepMs` as the snap target -- `Math.round` is itself the "threshold" Eric asked for: drag past roughly half a card's width and it commits forward (or back) to the next boundary, short of that and it settles back to the one it started near -- then eases there via `animateMarqueeTo` before resuming normal autoplay (or staying paused, if the lane was already hard-paused via the play/pause button), so releasing a drag reads as a continuation of the same gesture rather than a cut. This is deliberately a different feel from `skip()`'s own instant-jump behavior (reverted to instant 2026-09-18 specifically because a *button click* should feel immediate) -- a drag release is the tail end of a gesture the visitor's hand is already mid-motion on, so following through smoothly is the right feel for this specific interaction rather than the same instant-cut rule.

**A real bug caught during verification, not assumed from the code:** the first version's `resume()` closure read `drag.wasHardPaused` directly, but `drag` gets set to `null` synchronously later in the same `endDrag()` call, well before `animateMarqueeTo`'s `requestAnimationFrame` loop actually finishes (~260ms later) and invokes `resume()` -- a live page-console check during testing surfaced a real `Cannot read properties of null (reading 'wasHardPaused')` error, and the animation was left permanently paused instead of resuming. Fixed by snapshotting `wasHardPaused`/`moved` into local consts before nulling `drag` out, the same "capture what you need before the reference goes away" fix this file has already documented once before for a similar async-closure trap (see the `window.GZ` vs. bare `GZ` bug in Round 7's dialog-focus entry above -- a different root cause, but the same category of "looks fine reading the code top-to-bottom, breaks once you account for what's still true by the time the async callback actually runs").

Verified via live Puppeteer against the real hero photo strip: pointerdown correctly pauses the animation (confirmed via `playState`), a real pointer drag scrubs `currentTime` smoothly and continuously during the gesture, and releasing snaps `currentTime` to an exact multiple of the measured step size (0.0ms remainder in the passing run) before resuming `playState: 'running'` and continuing to advance normally afterward -- not just reasoned about from the math on paper. Since this lives in the one shared `GZ.enableMarqueeDrag`/`GZ.marquee()` implementation, the fix reaches every consumer at once (hero photo strip, Past Events waterfall, Academy/Ambassador galleries, Reviews, Featured Gear) rather than needing a per-instance change.

Cache-bust bumped `?v=95` -> `?v=96` across all 6 shared-convention HTML files, since `main.js` changed.

**Verification for this round:** full scripted QA suite (981 text items / 5 pages, 0 container-width findings, 0 console errors; the same 25 already-disclosed Featured Gear horizontal-overflow false positives and nothing new), live Puppeteer functional checks for both changes (Zone Stack's new 5-card count and correct carousel advance; the marquee drag-pause/scrub/snap/resume cycle including the `wasHardPaused` null-reference fix), and mobile/tablet/desktop screenshots of the About Gamer Zone section confirming the peek-card carousel still renders cleanly with 5 dots and no clipping at any width.

## Round 9, next day: the REAL cause of "drag still not smooth" -- a spurious pointercancel, not the snap-tween (2026-09-19)

Round 8's drag-snap fix didn't hold up: Eric reported "mouse drag still not smooth for photo reels, is conflicting with autoscroll feature," and separately, mid-investigation, a second bug: "when I click and drag on the zone card stack, it should auto next and stop my drag, I can currently drag it infinitely one direction or another." Both turned out to trace back to the same underlying browser behavior, confirmed via direct, timestamped event instrumentation on a live page (not guessed from reading the code) -- three real, distinct bugs total, two of them a genuine surprise relative to what Round 8 assumed the remaining problem was.

**Bug 1 (real, but not the dominant one): `pointerleave` firing mid-drag based on real screen position, independent of pointer capture.** Both `GZ.enableMarqueeDrag` (`main.js`) and the Zone Stack carousel (`zone-stack.js`) ended a drag on `pointerleave`, on the reasonable-sounding assumption that "the pointer left the element" means "the gesture is over." It doesn't, once `setPointerCapture` is active: capture guarantees `pointermove`/`pointerup`/`pointercancel` keep targeting the captured element no matter where on screen the pointer travels, but `pointerleave`/`pointerenter` still fire off the pointer's real screen position regardless of capture (confirmed live in Chromium; MDN's own capture docs note boundary events are unaffected by capture). Every marquee lane is a short, wide horizontal strip and the Zone Stack section is comparably shaped, so an ordinary horizontal drag routinely dips outside the element's own vertical bounds for a frame -- which used to silently end the drag right there. Fixed in both files: `pointerleave` now only ends the drag if capture was never actually obtained for that pointer (checked via `element.hasPointerCapture(e.pointerId)`) -- once real capture is active, only `pointerup`/`pointercancel` should end it. Verified live: a scripted drag whose path deliberately moved 200px above the hero photo strip's own bounds, and separately above the Zone Stack's own bounds, kept tracking smoothly the whole time instead of freezing.

**Bug 2 (the dominant, actual cause of "still not smooth"): Chromium fires a real `pointercancel` mid-gesture with the mouse button still physically held the entire time.** This is the genuine surprise of this round -- not a logic bug in this project's own code, a real Chromium behavior with no touch-action conflict, no actual pointer hardware event, nothing in this codebase triggering it. Confirmed by instrumenting `pointerup`/`pointercancel`/`pointerleave` with live timestamps and separately monkey-patching the marquee's `Animation.currentTime` setter to log every write: a `pointercancel` fired on the drag target seconds into a still-held gesture, which called `endDrag()` exactly as designed (per spec, a cancel means "this gesture is over") -- kicking off the release-tween and, on the marquee, resuming autoplay -- while the visitor's mouse was still down and still moving. Because `drag`/`dragging` was now cleared, every further `pointermove` for the rest of that same physical hold was silently ignored (`if (!drag) return`), so from the visitor's side the drag just stopped responding while the reel kept scrolling on its own underneath their still-held pointer -- precisely "conflicts with autoscroll." Round 8's snap-tween race fix (the `_gzSnapGen` generation counter) was solving a real but secondary problem; it never touched this because pointercancel firing mid-gesture wasn't yet identified as the actual trigger.

**Fix: self-heal instead of trying to prevent the browser's cancel.** Since a spurious mid-gesture `pointercancel` can't be prevented from application code, both `main.js`'s `enableMarqueeDrag` and `zone-stack.js`'s carousel now treat "a `pointermove` arrives for a pointer that isn't currently tracked, but its primary button (`e.buttons & 1`) is still reported down" as proof the gesture never actually ended -- and silently re-anchor tracking from that pointer's current position, exactly as if it were a fresh `pointerdown` (in `main.js` this is a small extracted `beginDrag(e)` function shared between the real `pointerdown` handler and this self-heal path in `pointermove`, so there's one setup routine, not two). Any in-flight snap tween from the phantom cancel's own `endDrag()` gets invalidated the normal way (the `_gzSnapGen` bump), so it stops fighting the resumed drag within a frame. Verified live: a hero-photo-strip drag that hit a real mid-gesture `pointercancel` (confirmed via the same instrumentation) kept tracking the pointer continuously through it with no visible interruption, and the settle-to-nearest-card-and-resume on eventual release still worked correctly afterward.

**A real regression caught and fixed before landing:** the naive version of this self-heal also fired after Zone Stack's own *intentional* mid-gesture commit (the threshold-based auto-advance-and-stop added in Round 8/9's own zone-stack fix below) -- since that path also leaves `dragging=false` while the mouse is still physically held, the very next `pointermove` was indistinguishable from a phantom-cancel recovery and re-opened a brand-new drag from the commit point, which could then cross the threshold *again* on the same continued gesture and double- or triple-advance. Fixed with a `committedPointerId` guard: set the instant a gesture commits mid-drag, checked by the self-heal path (refuses to re-open a hold that already committed), and only cleared by a real `pointerup`/`pointercancel`/`pointerleave` for that same pointer -- the only actual proof the physical hold ended. Verified live: holding through a committed drag, continuing to move another 300px in the same direction, and finally releasing all produced exactly one card advance, not two or three.

**Zone Stack's own separate bug, per Eric's second report:** committing to next/prev used to only ever happen at `pointerup` (see `endDrag`) -- so the gesture itself could be dragged arbitrarily far (up to the stack's own clamped max width) with nothing visibly happening until the pointer finally lifted, which is what "I can drag it infinitely" was describing. Fixed with a new `stopDragState()` helper and a threshold check added directly inside `onPointerMove`: the instant `|dragX|` reaches `DRAG_COMMIT_PX` (70px) *while still dragging*, it commits to `next()`/`prev()` and ends the gesture right there, rather than waiting for release. A genuine fast-but-short flick (under the pixel threshold) still commits via velocity at release, in `endDrag`, unchanged. Verified live end-to-end: dragging under threshold does nothing, crossing it advances exactly once and `--zs-drag` resets to `0px` immediately, continuing to drag further in the same held gesture does not advance again, releasing does not double-advance, and a fresh independent drag right after works normally.

**A disclosed, minor residual behavior, not chased further:** if the phantom `pointercancel` happens to fire during a moment where the visitor is holding the pointer completely still (not actively moving), the drag settles to the nearest card and autoplay resumes early, since self-heal only re-engages on the *next real pointermove* and none arrives until the visitor either moves again or releases. This is a much smaller, more acceptable edge case than the original bug (a live-dragging visitor is never left fighting a resumed autoscroll), and distinguishing "real cancel" from "phantom cancel" more precisely would require deeper browser/OS-level investigation with no clear payoff -- noted here per the no-fabrication rule's spirit of disclosing tradeoffs rather than claiming a fix is more complete than it is.

**Root-cause methodology, for a future session hitting something similar:** the actual cause was found by adding temporary, targeted instrumentation directly into the shipped functions themselves (a raw `console.log` inside `main.js`'s `step()`, and separate listeners logging every `pointerup`/`pointercancel`/`pointerleave` with timestamps) and running real Puppeteer-simulated drags against them -- not by reasoning about the code from its comments, and not by trusting the first hypothesis (an in-flight snap-tween race) just because it was plausible and partially true. All temporary debug `console.log` calls were removed before this round was considered done.

Cache-bust bumped `?v=96` -> `?v=97` across all 6 shared-convention HTML files, since `main.js` and `zone-stack.js` both changed.

**Verification for this round:** full scripted QA suite (981 text items / 5 pages, 0 container-width findings, 0 console errors; the same 24 already-disclosed Featured Gear horizontal-overflow false positives and nothing new), and live Puppeteer functional checks for every change described above (pointerleave-out-of-bounds tracking on both the marquee and Zone Stack; the marquee's phantom-pointercancel self-heal keeping a drag continuously live; Zone Stack's threshold-commit-and-stop with no double-advance and no infinite drag; a fresh independent drag working correctly right after a committed one).

## Round 10, same day: attendance-bonus badges matched to tier-pillar "Events Hosted" tag style, color wheel now follows real click position (2026-09-19)

Per Eric, two direct, fully-specified requests:

**Attendance bonus badges (`.sg-badge`, "20+/40+/60+ Attendees") redesigned to visually match the tier pillar's "Events Hosted" tag (`.mile-count`).** Per Eric ("make the 20/40/60+ attendees tags look like the 1/2/4/6 events hosted tag... the numbers are much larger than the actual words... make it look clean and consistent"): `.sg-badge` was a solid-tinted, drop-shadowed pill with a large `2.1rem` number and a small `.72rem` label crammed to one side -- visually a different design language than `.mile-count`'s clean pill (a `var(--bg-3)` fill, a 2px tier-colored border, no shadow, a `1.5rem`/800-weight number next to a `.68rem`/700-weight uppercase label, both baseline-aligned and centered as one unit). `.sg-badge` in `style.css` now uses the exact same shape/sizing spec: `border-radius:999px`, `background:var(--bg-3)`, `border:2px solid` (tier-colored, replacing the old solid tinted fill + glow shadow), `padding:.55rem 1.1rem`, `.pts` at `1.5rem`/800-weight (down from 2.1rem) and `.lbl` at `.68rem`/700-weight (up from .72rem/plain, but now proportionally much smaller relative to the number, matching Eric's "numbers are much larger" ask), and the whole `.sg`/`.score-guide` card gained `text-align:center` so the badge, its "Bonus Unlocked" eyebrow, and its unlock copy all center as one unit -- `.score-guide .sg > p.dim` (the description paragraph below) was deliberately excluded from the centering (`text-align:left`) since a multi-line paragraph reads better left-aligned even inside an otherwise-centered card. Colors are now applied the same way `.mile`'s tier system already does elsewhere on this page: the border and the number pick up each tier's accent color (`#D69555` bronze, `#a9bccd` silver, `var(--ne-orange)` gold), while the label uses a neutral `var(--ink-dim)` rather than inheriting the accent -- this was a deliberate, verified choice, not an oversight: the label used to inherit `.sg-badge`'s own accent `color`, which read fine against the old bright tinted-glow background but measured only 5.68-6.91:1 (under the 7:1 AAA floor) against the new neutral `--bg-3` pill fill once sampled for real; giving `.lbl` its own explicit `--ink-dim` color instead fixed this to a clean pass, confirmed via a full audit run afterward. Verified via live screenshots (`tools/audit/out/sg-badge-desktop.png`, `sg-badge-mobile.png`) at 1400px and 390px, and a direct visual comparison against `.tier-pillars` (`tools/audit/out/tier-pillars-desktop.png`) confirming the two components now read as the same design language.

**Color wheel (`#gz-color-wheel`, the "Grid Color" popover's hue picker) now lands the knob wherever the wheel is actually clicked, not just at the outer rim.** Per Eric ("allow me to click anywhere in the wheel, not just the outside -- the node should go to that position"): `rgb-cursor.js`'s `setKnobFromHue()` always rendered the knob at a fixed `WHEEL_R` (64px) radius regardless of where the pointer actually landed, since this wheel's color only ever varies by angle (a real, correct design choice for the hue math itself -- this `conic-gradient` wheel has no radius-dependent color, so radius was never meaningful to the *color*), but that meant a click near the center visually snapped the knob straight out to the rim instead of landing under the pointer, reading as broken for anything but an edge click. Fixed by introducing a separate `knobRadius` state variable, decoupled from the hue itself: a new `radiusFromPointer()` computes the real clamped distance from the wheel's center (`Math.min(WHEEL_R, Math.hypot(dx,dy))` -- clamped so a drag that strays outside the visible disc still parks at the rim rather than flying off past it), and a new `applyPointer()` wrapper (called from both `pointerdown` and `pointermove`, replacing the old direct `applyHue()` calls) sets `knobRadius` alongside the hue on every real pointer interaction. A keyboard-driven hue change (arrow keys) intentionally leaves `knobRadius` untouched, since there's no pointer position to derive a new one from -- the knob's distance from center only ever changes via a real click/drag, its angle changes via either. Verified via live Puppeteer clicks at three distinct radii (a near-center click landing the knob within ~1px of its exact clicked position rather than snapping to 64px out; a near-edge click; an exact 45deg/radius-32 click landing the knob at a measured distance of exactly 32.0px from center) plus the out-of-bounds case (a simulated click 500px above the wheel's center clamping cleanly to the full 64px rim, not flying off-screen) and a follow-up arrow-key press confirming the radius stays clamped at ~64px (only the angle moves) rather than snapping back to some other value.

Cache-bust bumped `?v=97` -> `?v=98` across all 6 shared-convention HTML files, since `style.css` and `assets/js/rgb-cursor.js` both changed.

**Verification for this round:** full scripted QA suite (983 text items / 5 pages, 0 container-width findings, 0 console errors; the same 24 already-disclosed Featured Gear horizontal-overflow false positives plus 1 already-disclosed marquee-timing review-quote false positive, both pre-existing categories documented under "Readability" above, and nothing new), a real contrast regression caught and fixed during the `.sg-badge` redesign (the `.lbl` color, see above), live Puppeteer verification of the color wheel's click-to-position math at multiple radii including the out-of-bounds clamp and keyboard-preserves-radius cases, and mobile/tablet screenshots of the `#cursor-modal` popover confirming no clipping at either width.

## Round 11, same day: no text-selection on marquee drag, brief (not instant/not slow) skip transition, Collegiate wizard-hat icon, badge label centering, attendance-bonus orange ramp (2026-09-19)

Per Eric, five direct, fully-specified requests/bug reports in one stretch:

**Marquee drag no longer highlights text underneath it.** Per Eric ("distracting when I mouse drag reviews"): a plain click-drag over any text node is the browser's own built-in text-selection gesture, indistinguishable at the `mousedown` moment from `GZ.enableMarqueeDrag`'s pointer-drag-to-scrub gesture (`main.js`) -- both start on the same `mousedown`. `.gear-item`/`.zone-card` already carried `user-select:none` for exactly this reason (see those rules elsewhere in `style.css`), but the shared `.gz-marquee` lane itself never did, so every *other* consumer (Reviews, Past Events, hero-proof, the Academy/Ambassador photo galleries) was still selectable text underneath its own drag handler. Fixed once on `.gz-marquee` itself (`-webkit-user-select:none;user-select:none`) so it reaches every consumer at once, per this file's "one shared implementation" rule. Verified via a live Puppeteer drag across a Reviews card: `window.getSelection().toString()` stayed empty throughout and after the drag, and computed `user-select` on `.gz-marquee` reads `none`.

**Marquee skip button: a brief, quick tween, not an instant cut or a slow glide.** Per Eric ("am I allowed to add a quick and brief transition when I click next item on each reel... less sudden but also not so slow"): `skip()`'s history is its own small pendulum -- a ramped `requestAnimationFrame` poll (2026-09-08 spec: "smoothly, not an instant cut"), reverted to an instant `currentTime` jump (2026-09-18, per Eric: the ramp read as a laggy wait). This round lands in between: `GZ.animateMarqueeTo` (`main.js`) gained an optional `dur` parameter (defaults to its existing 260ms), and `skip()` now pauses the animation, tweens to the target over a short **140ms**, then resumes autoplay (or stays paused, mirroring the drag-release `resume()` pattern's own `wasHardPaused`-captured-before-async-continues discipline) -- noticeably snappier than the 260ms drag-release snap (a button click should read faster than the tail end of a drag gesture), but no longer an instant teleport. Verified via live Puppeteer sampling `currentTime` every 25ms after a skip-button click: the value moved gradually across ~6 samples before settling, rather than jumping in one frame, and `playState` returned to `running` afterward with zero console errors.

**Collegiate Ambassador icon changed from a graduation cap to a wizard/witch hat.** Per Eric ("make the icon for collegiate ambassador a wizard or witch hat, so it feels in theme with the sword and the bow" -- Influencer and Organization's existing `sword`/`bow` icons, see "Ambassador redesign," 2026-09-15, above, for that icon assignment's own history): a new `wizardhat` glyph was added to the shared `GZ_ICONS` set (`main.js`) -- a simple flat cone-plus-brim silhouette with one curled-tip detail (a `q` curve near the apex) matching this icon set's existing geometric style (see `sword`/`bow`'s own similarly minimal paths), rather than a more detailed illustrative glyph. The existing `grad` glyph itself is untouched and unremoved -- `edu.html`'s own hero icon badge still uses `grad` for the Academy page (see "Interior-page hero icon badges," Phase 2, above), so only the two Collegiate-specific usages (`ambassador.html`'s track card, `index.html`'s `#amb-teaser` homepage teaser card) were switched from `data-ic="grad"` to `data-ic="wizardhat"`. Verified via a zoomed live screenshot of the rendered icon confirming it reads clearly as a witch/wizard hat (cone, curled tip, wide brim) rather than an ambiguous triangle, and a full-section screenshot confirming all three track icons (wizard hat, sword, bow) render correctly with zero console errors.

**"Events Hosted"/"Attendees" labels now vertically center against their big numbers, not baseline-align.** Per Eric ("make events hosted and attendees for the ambassador bonuses center aligned with the big numbers"): both `.mile-count` (the tier pillar's "N Event(s) Hosted" tag) and `.sg-badge` (the attendance-bonus "N+ Attendees" tag) used `align-items:baseline` on their flex row -- with the number at `1.5rem`/800-weight next to a much smaller `.68rem`/700-weight label, baseline alignment sat the label's own text-baseline flush with the number's baseline, which visually reads low/bottom-heavy rather than centered against the number's full height. Both switched to `align-items:center`. Verified via live screenshots of both components at desktop confirming the label now sits vertically centered against the number in every tier/tag.

**Attendance-bonus badges (`.sg-badge`) recolored from bronze/silver/gold to a real lighter-to-brighter orange ramp.** Per Eric ("have the color in the attendance bonus go from lighter to brighter oranges"): the `.sg-bronze`/`.sg-silver`/`.sg-gold` class names (unchanged, still what `ambassador.html`'s markup uses) previously resolved to a muted tan (`#D69555`) and a blue-grey (`#a9bccd`) -- a medal-tier naming leftover from this badge's pre-2026-09-19-earlier-round styling, neither of which was actually orange, so there was no real "lighter to brighter" progression to see despite the names implying one. Replaced with a genuine monochromatic ramp across the three real ascending thresholds (20+ -> 40+ -> 60+, per `ambassador.html`'s own markup order): a pale tint (`#FFC98A`) for 20+, a mid-saturation orange (`#FBAE4A`) for 40+, and the site's own standard `--ne-orange` (already used everywhere else as the site's "brightest" orange, e.g. the shared `.btn` gradient) for 60+ -- so the brightest real orange on the page lines up with the highest threshold, the same "brightness signals more" logic the tier system already uses elsewhere. Contrast computed for real via the WCAG relative-luminance formula rather than assumed from "lighter reads as safer": `#FFC98A` and `#FBAE4A` against `--bg-3` (`#16181D`) come out to **11.8:1** and **9.5:1** respectively -- both comfortably clear of the 7:1 AAA floor, consistent with `--ne-orange`'s own already-documented 8.4:1.

Cache-bust bumped `?v=98` -> `?v=99` across all 6 shared-convention HTML files, since `style.css` and `assets/js/main.js` both changed (the two icon-usage HTML edits are covered by the same bump).

**Verification for this round:** full scripted QA suite (957 text items / 5 pages, 0 container-width findings, 0 console errors; `ambassador.html` itself came back with 0 findings -- the 24 disclosed Featured Gear horizontal-overflow false positives on `index.html` are the only failures, nothing new), live Puppeteer checks for every interactive/visual change described above (text-selection-during-drag, the skip tween's gradual `currentTime` progression, the wizard-hat icon's rendered shape), and a full-page mobile screenshot of `ambassador.html` confirming the wizard-hat/sword/bow track icons, the centered tier-pillar tags, and the three orange-ramped attendance badges all render cleanly with no clipping at 390px.

## Round 12 (2026-09-22): individual event cards -- real per-event photo backgrounds return, plus prize/perk data and a hidden square/horizontal social-export page

Per Eric: "we should have an individual event card design... on days with specific events, we
special graphics. Daily normal free play, use one of the base images, and then have a more
special Background image for the specific event day... For Saturday Slam, use a blurred past
crowd image of the street fighter, and add details for prizing... Free Pizza Lunch as well."
Per core rule 15 this was a real, open-ended design question (a new visual system, not a
one-line instruction), so the concrete design was mocked up and shown first (a standalone
preview file, not touching any live page) before anything was implemented -- Eric reviewed it
and approved with two corrections: "the horizontal should be 1920x1080 export" (the initial
mockup proposed 1200x630) and confirmed the data structure. Implemented in full once approved.

**Real per-event photo backgrounds are back on the `events.html` Plan Your Visit calendar's
`.cal-detail` panel**, after being removed site-wide on 2026-09-08 for an intermittent
"renders once then disappears" flash/pop bug that was never actually root-caused at the time
(see that date's own comment in this file and in `style.css` -- the old fix just deleted the
photo layer rather than diagnosing the race). This round targets the two most likely real
causes of exactly that symptom, rather than re-shipping the same mechanism and hoping the bug
doesn't recur:

1. **No more CSS-custom-property indirection.** The old code set `--cd-bg` via
   `el.style.setProperty()` and read it back via a `::before{background-image:var(--cd-bg)}`
   rule defined hundreds of lines away in `style.css` -- two separate writes to reconcile. The
   new `bgLayer(url)` (`assets/js/calendar.js`) bakes the URL directly into a real `<div>`'s
   inline `style` attribute as part of the exact same `innerHTML` string that renders the
   day's title/blurb/meta -- one atomic DOM write, nothing set-then-read-later to race against.
2. **Every possible background URL is preloaded up front** (`preloadBgs()`, called once at
   init) via a plain `new Image()` per URL -- if the original bug really was a load-order/
   caching race on a rapid hover-sweep (the CSS comment's own working theory), every image the
   calendar can ever show is already fetched and cache-warm before a visitor's cursor can move
   fast enough to trigger it.

`bgFor(e)` resolves a per-event `image` override (new, in `data/events.json`) first, then
falls back to the existing per-type `TYPE_BG` lookup or the major-event date-hash pool
(`majorBgFor()`, unchanged) -- so every day still gets *some* real photo (Eric's own "daily
normal free play, use one of the base images" ask was already true of `FREE_PLAY_BG`, just
not rendered since 2026-09-08), and only a day with a real, specific photo on file gets
something more special. Closed days deliberately stay a flat panel -- there's no "day of"
photo for a closure, and photo-backing every single day type was never what was actually
asked for.

**Verified functionally two ways**, since this repo has no working system Chromium and no
root access to install one via `apt` directly (see "headless Chrome now launches locally" note
below for how a real browser was eventually gotten working this same session):

- A jsdom-based structural test (`calendar.js` loaded via `window.eval()`, a stubbed `GZ`/
  `fetch`, real `mouseover` events dispatched at every visible day cell in sequence -- the
  exact rapid-hover-sweep shape the original bug happened under) confirmed zero thrown errors
  across all 30 cells, exactly one `.cd-bg-photo` node present in the DOM after every single
  step (no leftover/duplicate nodes from the old element persisting alongside a new one), and
  that returning to the SF6 date after the sweep still rendered correctly (nothing "used up").
- Once headless Chrome was working (see below), a real Puppeteer run repeated the same rapid
  hover-sweep against the live rendered page and screenshotted the panel immediately after
  landing back on a Free Play day: it rendered cleanly with the real `dailyplay-bg-blurred.jpg`
  photo, no visible flash artifact, no stale content from prior hovers.

**New structured event data, generalized for reuse, not hand-coded once for this one event.**
`data/events.json`'s Street Fighter 6 Saturday Slam entry (2026-09-26, real, pre-existing)
gained: `"image"`/`"imageHD"` (the real crowd photo, see sourcing below, at panel-resolution
and full-HD respectively), `"prizes":[{"place":1,"amount":150}, ...]` (the real 1st/2nd/3rd/4th
payouts Eric gave: $150/$100/$75/$50), and `"perks":["Free Pizza Lunch"]`. `calendar.js`'s new
`prizeBlock(e)` renders a `<div class="prize-table">` + perk chips generically off these two
fields for *any* event that defines them -- a future tournament gets the identical treatment
just by adding the same fields to its own JSON entry, not a copy-pasted one-off block.

**Real photo sourcing, following this project's own "actually open and look at candidates, not
just match filenames" discipline** (established repeatedly elsewhere in this file, e.g. the
USC Games jersey photos, the XP League image searches): `assets/img/StreetFighterSaturdaySlam-
07-25/` already held 11 real, unpublished-elsewhere photos from the actual July 25 2026
Saturday Slam event (already used in `events.html`'s Past Events waterfall). `DSC05060.jpg`
was the strongest real "SF6 tournament + visible crowd" candidate after viewing several: a
busy tournament floor, 15-20+ people at PC stations under blue/white LED lighting, two screens
visibly showing 2D fighting-game gameplay mid-match. Resized/pre-blurred offline (matching this
project's existing `-blurred.jpg` convention -- Gaussian blur + darken + slight desaturate
baked into the JPG itself, not a live CSS blur filter, for the same "renders blocky in some
browsers" reason already documented elsewhere in this file) at two resolutions: 1280px wide
(`sf6-saturday-slam-crowd-blurred.jpg`, for the calendar panel) and the source's full 1920x1080
(`sf6-saturday-slam-crowd-blurred-hd.jpg`, for the horizontal social export, where a 1280px
source would have looked soft stretched to 1920px). Both saved to
`assets/calendar/BGAssets/`, alongside every other event-type background photo, per this
project's "one place for this kind of asset" convention.

**A new hidden export page, `event-card.html`, for the square/horizontal social-share
graphics** -- reserved for "special" events per Eric's own framing, not generated for every
ordinary day. Follows the existing `screenshot-monthly-calendar.html`/`screenshot-weekly-
lineup.html` convention (noindex, nofollow, not linked from nav, a header comment explaining
its purpose), but unlike those two hand-authored pages, this one is **data-driven**: it fetches
the real `data/events.json` and renders whichever event id is requested
(`event-card.html?id=<id>&format=square|horizontal`), defaulting to the next upcoming event
that actually has real extra detail on file (an `image` override or `prizes`/`perks`) rather
than just whatever's chronologically next -- so a future special event needs only its own
data fields added, not a new page. `#card` is a real, fixed-size box (exactly 1200x1200 for
square, exactly 1920x1080 for horizontal, per Eric's correction from the initial 1200x630
mockup) with no page chrome around it, so opening the page at that exact browser viewport size
and screenshotting the full viewport is already a pixel-perfect crop -- no external cropping
step required. Reuses the same shared `.tag`/`.prize-table`/`.prize-row`/`.perk-chip` classes
`calendar.js` introduced above (sized up via page-scoped overrides), rather than a second,
parallel copy of the same markup.

**Wiring this into `scripts/capture-social-images.mjs`'s existing Playwright+sharp automation
(which already knows how to launch a fixed viewport and screenshot a single element for the
Weekly Lineup board exports) is a real, disclosed next step, not done this round** -- which
events should auto-export, and on what schedule, is an open question for Eric per core rule
15, not a fully-specified one. `event-card.html`'s own header comment documents this for
whoever picks it up next.

**Headless Chrome now launches locally in this sandbox, for real Puppeteer verification** --
worth recording since past sessions' screenshots relied on an environment that apparently had
this already working, and this session's fresh sandbox did not. `tools/audit/setup.sh` (already
checked into the repo, unchanged) does exactly what a fresh environment needs: `apt-get
download` (no root required -- this only fetches .debs, it doesn't install them) the handful of
shared libraries headless Chrome needs beyond a minimal base image (`libxdamage1`,
`libgbm1`, `libnss3`, etc.), extracts them locally with `dpkg-deb -x`, and points
`LD_LIBRARY_PATH` at the extracted `.so` files -- `run-full-qa.sh` already auto-detects and
exports this path when `.deps/extracted` exists, so no manual step was needed once `setup.sh`
had run once. Running it early in a session (before reaching for a screenshot) would have
saved real back-and-forth this round -- a good habit for a fresh sandbox going forward.

**Verification for this round:** the full scripted QA suite (960 text items / 5 pages, 0
container-width findings, 0 console errors -- `events.html` itself came back with 0 contrast
findings despite the new photo panel and prize table; the same 24 already-disclosed Featured
Gear horizontal-overflow false positives on `index.html` and nothing new), the jsdom
rapid-hover-sweep structural test described above, and real Puppeteer screenshots at
desktop/tablet/mobile of the calendar detail panel (both the SF6 date and a plain Free Play
day, including immediately after a rapid sweep) plus both `event-card.html` exports at their
exact real pixel dimensions (1200x1200 and 1920x1080, confirmed via `getBoundingClientRect()`,
not just the CSS on paper) -- all with zero console errors.

Cache-bust bumped `?v=99` -> `?v=100` across all 6 shared-convention HTML files plus the new
`event-card.html`, since `style.css` and `assets/js/calendar.js` both changed.

## Round 13, same day: raffle-prizes tag, XP League partner-logo badge on recurring days, square event card's larger character graphic (2026-09-22)

Per Eric, three direct, fully-specified follow-ups to Round 12's individual-event-card feature
(implemented straight through per core rule 15):

**Raffle Prizes added as a second perk tag, next to Free Pizza Lunch.** `data/events.json`'s
SF6 Saturday Slam entry's `perks` array is now `["Free Pizza Lunch", "Raffle Prizes"]` -- a real
detail already implied by that same event's own `blurb` ("Free play and raffle prizes all
day"), not a new fabricated claim. No code change was needed: `prizeBlock()` in `calendar.js`
and the inline `perkHTML` logic in `event-card.html` both already map every string in `perks`
to its own `.perk-chip` generically (built in Round 12), so the second chip appears automatically
in the live calendar panel and both event-card export sizes.

**A real partner-brand logo badge, for recurring XP League Fortnite Training days -- distinct
from, and much lighter-weight than, the full per-event photo/prize treatment reserved for
one-off major tournaments.** Per Eric's own framing ("major tournaments will be a per event
creation"): a routine recurring day (6 XP League: Fortnite Training sessions currently on the
calendar) doesn't get the SF6-style full custom background + prize table -- it gets a small,
real XP League logo badge instead, generic and reusable the same way `image`/`prizes`/`perks`
already are. Implementation: a new `logo` field (`assets/img/XPLeague/xpleague-logo.png` --
the real XP League site-icon mark already sourced and self-hosted back on 2026-09-17, still on
disk though currently unreferenced elsewhere on the site since Academy's own XP League section
uses a different real action photo now) added to all 6 "XP League: Fortnite Training" entries
in `data/events.json`. `calendar.js` gained `logoBadge(e)` (returns an `<img class="cd-partner-
logo">` when `e.logo` is set, or `''` otherwise) called from the event-day branch of `show()`,
and `preloadBgs()` now also preloads every event's `logo` URL alongside its `image` URL, same
preload discipline as the rest of that function. `style.css` gained `.cal-detail .cd-partner-
logo` -- a small (52px) white-backed circular badge pinned to the panel's top-right corner via
`position:absolute`, `z-index:1`, so it sits above the photo/scrim layers without competing
with the day's own title/tag/meta text, which all still occupy their normal top-left position.
This field is intentionally *not* wired into `event-card.html`'s square/horizontal exports --
those are reserved for the fuller "special event" treatment per Eric's own major-tournament
framing, and a routine Fortnite Training day was never asked to get its own social-share export.

**The square (1200x1200) event card's content moved up, freeing room for a large real
character graphic.** Per Eric ("make room for a larger graphic somewhere... move the
information upwards... use the fighter games character in the lineup assets folder"): `#card`
(square format only, via a new `body:not(.fmt-horizontal)` scope -- the horizontal 1920x1080
format is untouched, since its own left-text/right-photo composition already has room) switched
from `justify-content:flex-end` (bottom-anchored) to `flex-start` (top-anchored), with `.content`
capped to `max-width:600px` (down from the shared 1020px) and given `margin-top:64px` to clear
the brand-row logo/text sitting in the same top-left corner. The freed lower-right space now
holds `assets/calendar/LineupAssets/FighterGames.png` -- confirmed via `PIL` before use to be a
real 1068x1472 transparent-background character cutout (54% alpha-transparent, not a solid
rectangle), not the smaller/differently-named `FightingGamesAsset.png` (this week's Weekly
Lineup theme icon) that could easily have been confused for it. Rendered as a new `.card-char`
element (square format only, `display:none` under `body.fmt-horizontal`), absolutely positioned
bottom-right at a real 1010px render height with a soft drop-shadow, sharing `.content`'s own
`z-index:1` and sitting earlier in the DOM so real text always wins the stacking order on the
rare pixels where they'd overlap. The square format's own scrim was also redesigned specifically
for this layout -- a diagonal `135deg` gradient (dark top-left, where text now sits; much
lighter bottom-right, where the character and crowd photo show through) replacing the shared
top-to-bottom scrim that was tuned for the old bottom-anchored text -- and the square-only prize
table drops to 2 columns (from the shared 4) to fit the now-narrower 600px content column
without cramming.

**Verified via live Puppeteer screenshots at both card's exact real pixel dimensions**
(1200x1200 square, 1920x1080 horizontal) confirming: the character renders with zero console
errors, real transparency (the crowd photo is visible through the cutout areas, not a solid
box), the "Raffle Prizes" chip appears correctly in both formats, the horizontal format's
existing layout is completely unaffected by the square-only CSS scoping, and a live screenshot
of the XP League Fortnite Training day's calendar panel (Sep 23, 2026) confirming the new corner
badge renders cleanly without overlapping the day's title/meta text. The full scripted QA suite
(`run-full-qa.sh`) came back clean: 976 text items / 5 pages, 0 container-width findings, 0
console errors, and only the same 25 already-disclosed Featured Gear horizontal-overflow false
positives (see "Readability" above) -- nothing new introduced by this round.

Cache-bust bumped `?v=100` -> `?v=101` across all 6 shared-convention HTML files plus
`event-card.html`, since `style.css`, `assets/js/calendar.js`, and `data/events.json` all
changed this round.

## Round 14, same day: character shrunk + added to horizontal + flipped/centered, real raffle-prize copy added (2026-09-22)

Per Eric, three quick follow-ups to Round 13's square/horizontal event card, all direct and implemented straight through per core rule 15:

**Character resized and added to the horizontal format.** Round 13's first pass rendered `FighterGames.png` at 1010px tall on the square card -- too dominant, per Eric's "make the character smaller" -- and only on the square format, which Eric expected to also see it on ("I don't see it in the horizontal version"). `.card-char` (`event-card.html`) is now 560px tall on square (down from 1010px) and a new 700px-tall instance renders on the horizontal format too (previously `display:none` there) -- `charHTML` in the page's script no longer gates on `fmt === 'square'`, so both formats get the same `<img>`, sized and positioned by their own CSS rule.

**Character flipped to face the text, and vertically centered.** Per Eric ("have the character flipped so hes facing the details... middle aligned so his feet aren't touching the bottom... centered in his Y value"): the source art faces right; `transform:scaleX(-1)` mirrors it to face left, toward the prize table/copy instead of away from it. Positioning changed from `bottom:0`/`bottom:-10px` (feet flush against the card's bottom edge) to `top:50%` + `transform:translateY(-50%) scaleX(-1)` on both formats, so the character sits centered in the available vertical space with real headroom above and below rather than anchored to the floor.

**Real raffle-prize detail added to the event's copy, not fabricated.** Per Eric's two follow-up messages ("Raffle prizes include MSI Monitors and Fight Sticks!" and "All attendees can participate in the Raffles, Fighters earn 1 extra ticket per win") -- both are facts Eric supplied directly, not invented, so per core rule 4 they're real information being added, not filled-in placeholders. The short, tagline-style prize detail went into `data/events.json`'s `subtitle` field (rendered large/prominent everywhere the card appears): `"SF6 local throwdown: enter the bracket, claim the crown. Raffle prizes include MSI monitors and fight sticks!"`. The longer participation-mechanics detail went into the event's `blurb` field instead (the fuller descriptive text, calendar-panel-only -- not rendered on the square/horizontal export cards, which never showed `blurb` to begin with): `"...Free play and raffle prizes all day. All attendees can participate in the raffle -- fighters earn 1 extra ticket per win. Walk-ins welcome."` Splitting the two follows the same subtitle-vs-blurb division of labor the rest of this event's data already uses -- subtitle is the short hook, blurb is the fuller explanation -- rather than cramming both onto one line.

**Verified via live Puppeteer screenshots** of both the square and horizontal `event-card.html` exports and the live `events.html` calendar panel for the SF6 date, confirming: the character renders smaller, mirrored, and vertically centered on both card formats with no overlap against the now-longer subtitle or prize table; the expanded subtitle wraps cleanly to two lines on both card sizes without clipping; the calendar panel's longer blurb wraps cleanly under the meta row with no overflow. The full scripted QA suite came back clean: 0 container-width findings, 0 console errors across all 5 pages, and only the same already-disclosed Featured Gear horizontal-overflow false positives from every prior round -- nothing new.

Cache-bust bumped `?v=101` -> `?v=102` across all 6 shared-convention HTML files plus `event-card.html`, since `data/events.json` (subtitle/blurb) and `event-card.html` (CSS/JS) both changed this round.

## Round 15, same day: character echo/fade trail, horizontal character re-centered, higher-opacity prize boxes, "Place" label fix (2026-09-22)

Per Eric, one direct, fully-specified request ("Can we do the opacity multiple image fade effect that the mario kart one had, so underneath are at least 3 lower opacity things of the graphics positioned with different x values. In the horizontal one, make the character in the middle of the empty space. Make the prize areas higher opacity, write out 1st place and place for each one.") -- implemented straight through per core rule 15, all changes scoped to `event-card.html` alone.

**"The mario kart one" identified and reused, not reinvented.** Read `assets/js/event-update.js` and `assets/css/style.css` before writing any new code, per this project's own "read and understand before implementing" discipline. The referenced effect is `.eu-board-icon`'s existing 5-copy echo/fade-trail treatment on the Weekly Lineup board's per-week theme icon export (`html.board-mode`) -- not Mario-Kart-specific code, just a generic per-week icon treatment that the currently-active Mario Kart World Tournament week happens to use. The technique: every copy is absolutely positioned at the exact same anchor point, then each gets its own additional offset baked into the same positioning, paired with decreasing opacity/size/z-index per copy -- reads as a motion trail rather than a flat stack. `.card-char`'s new echo trail reuses this exact idea, adapted to this card's own right-edge (square) / centered (horizontal) anchor scheme rather than copying the theme-icon's specific `translate(calc(-50% + Xpx),...)` percentages verbatim.

**3 ghost copies added underneath the main character (4 images total), via 3 new `.card-char-ghost-1/2/3` `<img>` elements** (same `FighterGames.png` src, `charHTML` in `event-card.html`'s script), each with a progressively larger offset, smaller size, and lower opacity than the last: ghost-1 at 34px/498px-tall/.32 opacity, ghost-2 at 62px/440px/.16, ghost-3 at 86px/384px/.07 (square format) -- the main character stays full-opacity/560px/z-index:1. Every ghost sits at `z-index:0`, DOM-ordered ghost-3/ghost-2/ghost-1/main so ghost-1 (closest, most visible) renders above ghost-2/ghost-3 among that shared tier, and the whole group stays below `.content`'s own z-index:1 (which wins ties by sitting later in the DOM, per the existing comment on `.card-char`) so real text is never obscured by the trail.

**Horizontal format: character re-centered into the layout's actual empty space, not pinned to the right edge.** Per Eric's "make the character in the middle of the empty space": the content column (`.content`, max-width 900px) sits against the left padding, so the genuinely empty area runs from roughly the content's right edge to the card's own right padding boundary. The character and its full ghost trail switched from a `right:50px` anchor to `left:74%` + `translate(-50%,...)` (a centered anchor), landing the whole group in the middle of that gap instead of flush against the outer edge -- verified visually via a live screenshot rather than assumed from the percentage on paper.

**Prize-row boxes: higher opacity.** `#card .prize-row` (page-scoped, same pattern as every other `#card`-prefixed override in this file) now sets its own `background:rgba(255,255,255,.16)` / `border:1px solid rgba(255,255,255,.34)`, up from the shared `style.css` default (`.06`/`.16`) -- per Eric's "make the prize areas higher opacity" request, confirmed visually more prominent against the photo/scrim background in both formats.

**"Place" label fix -- a real drift between two rendering paths, not a new feature.** `event-card.html`'s own inline `prizeHTML` template rendered bare ordinals ("1ST", "2ND", "3RD", "4TH") with no "Place" word, while `calendar.js`'s `prizeBlock()` (the live calendar-panel version of the same data) already rendered `${ord(p.place)} Place` correctly. This is exactly what Eric's "write out 1st place and place for each one" was describing. Fixed by bringing `event-card.html`'s template in line: `${ord(p.place)} Place` now renders "1ST PLACE"/"2ND PLACE"/"3RD PLACE"/"4TH PLACE" on both card formats, matching the live calendar panel.

**Verified via live Puppeteer screenshots** of both the square (1200x1200) and horizontal (1920x1080) `event-card.html` exports at their exact real pixel dimensions, confirming zero console errors on both, the echo trail visibly fading out behind the character in both formats (a soft blue/orange glow trailing the main figure, most visible near the head/shoulder in the horizontal crop), the horizontal character sitting centered in the layout's empty space rather than pinned to the edge, the prize boxes reading visibly more opaque/prominent, and all four prize labels reading "1ST PLACE"/"2ND PLACE"/"3RD PLACE"/"4TH PLACE". The full scripted QA suite came back at the known-clean baseline: 0 container-width findings, 0 console errors across all 5 pages, and only the same 24 already-disclosed Featured Gear horizontal-overflow false positives on `index.html` (see "Readability" above) -- nothing new introduced by this round.

No cache-bust bump needed this round -- every change is scoped to `event-card.html`'s own inline `<style>`/`<script>` blocks, which aren't cached by a shared `?v=` tag the way `style.css`/`main.js` are.

## Round 16, same day: echo trail corrected -- ghosts stay full-size and sit to the right, square character nudged further left (2026-09-22)

Round 15's echo trail shipped with two real mistakes, both caught and corrected by Eric in the very next message: the ghost copies shrank progressively (the Weekly Lineup theme-icon reference does shrink its echoes, but Eric's own request never asked for that here), and on the square format they landed to the *left* of the main character rather than the right, because the anchor scheme used `right:Npx` and increasing that value moves an element left, not right.

**Ghosts no longer shrink.** Every `.card-char-ghost-*` now shares the exact same `height` as `.card-char` in both formats (560px square, 700px horizontal) -- only `opacity` and position differ between the main character and its 3 echoes, never size.

**Ghosts now sit to the right of the main character, both formats.** Fixed by making the ghosts' base position identical to the main character's (`right:40px` square, `left:74%` horizontal) and applying the rightward offset via an *outer* `translateX` in the transform list -- `transform:translate(Xpx,-50%) scaleX(-1)` -- rather than via the `right`/`left` property itself. This matters because of transform composition order: functions apply right-to-left, so `scaleX(-1)` (the mirror flip) resolves first, then the outer `translate(...)` moves the already-flipped element in real screen-space, meaning a positive X value reliably moves right on screen regardless of the character's mirroring. The square format's ghost offsets (26/48/68px) intentionally mirror the original Mario Kart reference's own 26/48/68px spacing now that they're doing the same "position-only" job; the horizontal format's offsets (40/74/104px, unchanged from Round 15) were already correct in direction, just needed the shrink removed.

**Square character nudged further left.** Per Eric's direct "move the square image fighter slightly more to the left": `.card-char`'s `right` value moved from `0` to `40px` -- this also opens up genuine visible room to its right for the echo trail to occupy, rather than the ghosts needing to extend past the card's own edge.

**Verified via live Puppeteer screenshots and zoomed crops** of both formats at their exact real pixel dimensions, confirming: all 3 ghost copies render at the same size as the main character in both formats, the echo trail is visibly positioned to the character's right (along his back/shoulder/legs) rather than his left, and the square character sits visibly further left than Round 15's version with no clipping against the card edge. The full scripted QA suite came back at the known-clean baseline: 0 container-width findings, 0 console errors across all 5 pages, and only the same 25 already-disclosed Featured Gear horizontal-overflow false positives on `index.html` -- nothing new.

No cache-bust bump needed -- same as Round 15, every change is scoped to `event-card.html`'s own inline `<style>` block.

## Round 17, same day: bigger $ amounts, date/time, and perk tags on the event card -- plus a real contrast gap found and fixed while verifying (2026-09-22)

Per Eric, three direct, fully-specified sizing requests in one message ("make the $ numbers larger, too much empty space in those nodes... make the time and the date larger... make the node tags, free pizza lunch and raffle prizes larger"), implemented straight through per core rule 15 -- all three scoped to `event-card.html`'s existing `#card`-prefixed CSS, same convention as every prior round on this page.

**Date/time (`#card .cd-meta-item`):** 24px -> 30px, with its calendar/clock icon grown 26px -> 32px in lockstep so it doesn't read as undersized next to the bigger text.

**Prize $ amounts (`#card .prize-row .amt`):** 34px -> 48px, directly addressing "too much empty space in those nodes" -- the number now actually fills the box's existing padding instead of leaving visible dead space around a small number. The place-badge circle (the "1"/"2"/"3"/"4" number) and the place-label text both grew a proportional amount too (badge 44px -> 50px, place-label 15px -> 19px) so the whole row still reads as one balanced unit rather than one oversized element next to two unchanged small ones.

**Perk tags (`#card .perk-chip`, "Free Pizza Lunch"/"Raffle Prizes"):** 22px -> 28px, padding `.6rem 1.2rem` -> `.75rem 1.5rem` to match.

**A real, pre-existing contrast gap found and fixed while verifying this, not introduced by it.** Per Eric's own follow-up question ("does this pass WCAGs"), every enlarged text element was checked with this project's standard live-render + pixel-sampling method (Puppeteer screenshot with text forced transparent to isolate the real rendered background, then WCAG relative-luminance math against each element's actual computed color) rather than reasoned about from the CSS on paper. Eleven of twelve passed comfortably. The twelfth -- `.prize-row .place-label` ("1ST PLACE"/"2ND PLACE"/etc.) -- measured only 5.0-6.1:1 against its real rendered background (the `rgba(255,255,255,.16)` prize box over this card's dark scrim/photo) using the shared `style.css` `--ink-dim` color (`#A6AEBC`). This gap predates this round: the element was already under 24px (15px before this round's own 19px bump), so it was always held to the 7:1 AAA floor for normal text, not the 4.5:1 large-text floor -- the size increase didn't cause this, it just happened to be what surfaced it during this round's own verification pass. Fixed with a page-scoped override, `#card .prize-row .place-label{color:#D0D5E0}` (the shared `style.css` `.place-label` default, used by `calendar.js`'s live calendar panel on a different, already-verified background, is untouched). First candidate (`#C7CCD8`) tested at a worst-case 7.20:1 across nine sampled backgrounds on paper, but one live-rendered square-format box (where the character artwork passes behind it) came back at 6.99:1 -- under the floor by a hair -- so it was nudged one step lighter to `#D0D5E0` and re-verified: worst live-sampled ratio across both formats is now 7.61:1.

**Verified via the same live Puppeteer + pixel-sampling method for all twelve text elements** (date/time x2, `.amt` x4, `.place-label` x4, perk-chip x2, at both formats where applicable) confirming every one now clears its WCAG AAA floor with real margin (worst case 7.61:1, most well into double digits), plus live screenshots of both the square (1200x1200) and horizontal (1920x1080) exports confirming no text wrapping, clipping, or overlap from any of the three size increases -- the square format (the one most likely to be viewed small/on mobile, per Eric's own framing) was checked specifically and reads cleanly at its full 1200px render. The full scripted QA suite came back at the known-clean baseline: 0 container-width findings, 0 console errors across all 5 pages, and only the same 24 already-disclosed Featured Gear horizontal-overflow false positives plus 1 already-disclosed marquee-timing review-quote false positive on `index.html` (see "Readability" above) -- nothing new introduced by this round.

No cache-bust bump needed -- every change is scoped to `event-card.html`'s own inline `<style>` block, same as every round on this page since Round 15.
