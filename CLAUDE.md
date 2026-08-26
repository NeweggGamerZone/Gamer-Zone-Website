# Repo conventions for this codebase

Read `docs/01-PRD.md` through `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` for product context. This file is for standing engineering/design rules that should hold across future sessions, regardless of which specific task is being worked.

## Text overflow in small card grids: no ellipsis

Applies to small, fixed-cardinality card grids — Featured Ambassadors, About Gamer Zone side cards, Visit/About/Preregister cards, and anything of that shape added later. Does **not** apply to long, dense list layouts (e.g. the Games catalog list), where a rare-case ellipsis + hover/tap popup fallback is the correct tradeoff — see `assets/css/style.css`'s `.game-list li .gl-name` comment for why that context is different.

In a card grid:

- Never truncate text with `text-overflow: ellipsis` or `-webkit-line-clamp` to force a card to a fixed height. If content is too long, let it wrap to as many lines as it needs.
- Rely on CSS Grid's default `align-items: stretch` (do not override it) so every card in a row auto-matches whichever card is currently tallest. One long name making one card taller makes the *whole row* a little taller, evenly — it should never look like a cut-off card sitting next to clean ones.
- Prefer shortening the actual copy first if something is unreasonably long (e.g. an example organization name), but the layout itself must never depend on clipping to look tidy — it has to hold up even if the copy can't be shortened.

`.host-card` in `assets/css/style.css` is the reference implementation.

## Diamond tier "flare" system (Ambassador cards)

`assets/js/ambassador.js` has `pickDiamondFlare()` — a deterministic, rarity-weighted picker for the Diamond-tier color variants defined in `assets/css/style.css` (`[data-flare="..."]` rules on `.host-card.tier-diamond`). It is not wired to anything live; the current example cards have `data-flare` set by hand. When the Ambassador event-log backend (roadmap #1 in `docs/08-USABILITY-AUDIT-AND-ROADMAP.md`) exists and can identify who has actually reached Diamond, call this picker with a stable per-ambassador id to assign their flare — do not hand-assign flares to real ambassadors, and never use `crimson` more often than its 1% weight implies.

## Decorative effects must never compromise text readability

This is a standing rule, not a one-off fix: no decorative texture, glow, shine, or background effect ships (or stays shipped) at a strength that makes text harder to read. Concretely:

- Any element that layers a decorative background behind real text (the tier crosshatch texture on `.mile`/`.host-card`, the Diamond shine, anything added later) must keep every text/interactive child at a higher `z-index` than the effect — check this explicitly, don't assume it. The 2026-08-25 "grids make the text unreadable" bug happened because `.mile`'s content (`.unlock`, `ul`, `.mile-count`, `.rank-badge`) had no `z-index` at all, so the shine painted on top of it.
- Keep decorative opacity low enough to read as flavor, not as a competing pattern. If a texture reads as "a grid" or "noise" rather than a subtle surface finish, its opacity is too high — the tier crosshatch is currently 6%/4% (`--tier-c` color-mix) after being cut down from 14%/9% for exactly this reason.
- Include a readability check in every visual/design pass on this site, the same way the no-ellipsis and Diamond-flare rules above get checked — don't just check "does the effect look cool," check "is every line of text on this component still comfortably legible with the effect running," including mid-animation for anything that moves.

## Testing interactive features (hero mini-game, and anything like it)

Checking for the absence of console errors is not the same as verifying a game or interactive widget actually feels functional, and isn't sufficient on its own. When testing anything playable (the hero mini-game in `assets/js/techno-hero.js`, or any future one), actually drive it: simulate the real input sequence (keydown/keyup over time, not just a single dispatched event), let it run for several real seconds, and confirm the loop behaves as intended — the shape moves the expected amount, collisions/scoring fire, nothing freezes or drifts — rather than only confirming it initializes without throwing.

## Unified metallic shine effect ("gz-shine")

There is exactly one metallic shine/flash effect on this site — the `.mile.tier-diamond::after, .host-card.tier-diamond::after, .btn::after` rule block in `assets/css/style.css` (search "Unified metallic shine"), driven by the `gz-shine` keyframe. Do not write a new bespoke shine animation for a future component — extend that selector list to include the new element instead, so there's one cadence and one look site-wide. Spec: exactly one flash every 60s (no idle mid-cycle resting state — rest is `opacity:0`, not a parked-off-screen gradient), a crisp white sweep with minimal feather (no soft blur), plus two small fixed four-point sparkle glints that twinkle on with the flash. Keep sparkle `background-position` placement near a component's corners/margins, not its center — the center is usually where the real text sits.
