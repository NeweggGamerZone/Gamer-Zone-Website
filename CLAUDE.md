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
