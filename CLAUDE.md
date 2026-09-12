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

There is exactly one metallic shine/flash effect on this site — the `.mile.tier-diamond::after, .host-card.tier-diamond::after, .btn::after` rule block in `assets/css/style.css` (search "Unified metallic shine"), driven by the `gz-shine` keyframe. Do not write a new bespoke shine animation for a future component — extend that selector list to include the new element instead, so there's one cadence and one look site-wide. Spec: exactly one flash every 60s (no idle mid-cycle resting state — rest is `opacity:0`, not a parked-off-screen gradient), a crisp white sweep with minimal feather (no soft blur), plus two small fixed four-point sparkle glints that twinkle on with the flash. Keep sparkle `background-position` placement near a component's corners/margins, not its center — the center is usually where the real text sits.

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
band's three class cards (Community Leader/Esports Host/Event Organizer) use large emoji
(🛡️⚔️🏹, `font-size:3.1rem`) rather than the small SVG glyphs `ambassador.html` uses for the
same classes — a deliberate, disclosed fallback: Eric asked for "bigger emojis or images,"
and a repo-wide search (html/js/json/md, uploads folder, filenames) turned up no real
USC/collegiate photo or logo asset to use instead. If one is ever supplied, swap it in
directly per the no-fabrication rule's honest-alternative principle — the emoji fallback
isn't meant to be permanent, just the honest option given what actually existed.

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
