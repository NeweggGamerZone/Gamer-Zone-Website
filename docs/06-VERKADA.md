# Verkada Pre-Registration — Yearly Link Refresh

Goal: let guests pre-sign a **Verkada guest link** so check-in is instant,
without the reservation page. The site's Visit/Preregister CTA reads
`verkadaUrl` directly (`assets/js/main.js`, `assets/js/calendar.js`):

    cfg.verkadaUrl || cfg.reservationUrl

**Update 2026-08-28 (corrected from the original "rotates ~2x/week"
assumption):** Verkada's guest self-registration link — the one Verkada
Command's Guest module hands you via **Get QR code -> Print a sign-in
page** — is long-lived, about **one year** from generation (the printed
page states an explicit expiration date). It is not a daily- or
twice-weekly-rotating token. Two earlier links that looked "expired" were
actually a broken/expired one-off link and, separately, an internal
Verkada Command **staff dashboard URL** that was mistakenly used instead
of the real guest-facing link — not evidence the real link rotates
often. Never publish a `newegg.command.verkada.com` staff-dashboard URL
(guest list, live camera feeds, "New Guest" button) as the public link;
the real one always resolves to a page whose title is "Guest Registration"
and shows the visit-type sign-in form.

An earlier plan (still visible in `scripts/update_verkada.py`'s prior
version and this doc's git history) called for a `verkadaDailyUrl` +
`verkadaDailyDate` pair with same-day priority logic. That logic was
never actually implemented in `main.js`/`calendar.js` — both read
`verkadaUrl` directly — so those two fields were dead weight and have
been removed from `data/config.json` (2026-08-28 cleanup).

## Current fields in `data/config.json`

- `verkadaUrl` — the live guest self-registration link. This is what the
  site actually uses.
- `verkadaUrlUpdated` — ISO date this link was last refreshed.
- `verkadaUrlExpires` — ISO date Verkada's own "Valid for 1 year" printout
  said this link expires. Refresh before this date.
- `reservationUrl` — legacy Newegg reservation-page fallback, used only if
  `verkadaUrl` is ever cleared/missing.

## A. Manual (always available)

1. In Verkada Command, open the Gamer Zone (Diamond Bar) guest site's
   dashboard, click the **QR Code** toolbar button, then **Print a
   sign-in page**. The printed page/QR states the expiration date.
2. Get the actual URL: the same toolbar's **Sign in** link (next to the
   QR Code button) exposes the current registration URL directly in the
   page — no need to decode the QR image itself. Copy it.
3. Run: `python scripts/update_verkada.py "PASTE_URL_HERE" "YYYY-MM-DD (expiry)"`
   — this writes `verkadaUrl`, `verkadaUrlUpdated`, and (if given)
   `verkadaUrlExpires` into `data/config.json`.
4. **Before publishing, verify the link actually opens a public
   registration form** (page title "Guest Registration", a visit-type
   sign-in form) in a fresh tab — never a "Can't Check In" error and
   never an internal staff dashboard (guest list, camera tiles, "New
   Guest" button). If the only link available is broken or internal,
   stop and leave the existing link in place rather than guessing.
5. Commit/push. The site's Visit CTA now uses it.
6. To fall back to the static reservation link: `python scripts/update_verkada.py --clear`

## B. Headless (Cowork scheduled task, yearly)

The `daily-updates` scheduled task (despite its name/history) now runs
**weekly, Mondays**, since that's the cadence the leaderboard refresh
still needs — the Verkada portion only actually acts when
`verkadaUrlExpires` is within about 30 days (or already past), otherwise
it's a no-op. This avoids relying on a single exact-day annual cron firing
correctly. See the task's own prompt (in Cowork's Scheduled Tasks) for the
exact logic.

Walk-ins are always welcome; pre-registration only skips the line.

## Recurring guest events — the low-maintenance setup (researched Jul 2026)

You do **not** create an event every day. Verkada Guest supports **recurring guest events** and **RSVP links**, and it emails registrants the day-of sign-in link + QR automatically. So the simplest fully-automated setup is:

- **Two recurring weekly events, set once:**
  1. **Free Play — 18+** (guest type: 18+ → collects name, ID as configured)
  2. **Free Play — Under 18** (guest type: Under 18 → collects guardian + ID as configured)
  Each set to **repeat weekly on Tue, Wed, Thu, Fri, Sat**. That's it — two events cover every open day, indefinitely.
- Verkada's per-guest-type **custom sign-in fields** handle the different requirements (18+ vs under-18 with guardian). One recurring event per guest type keeps profiles clean.
- **One registration per visitor** — each guest registers themselves (the site says so on the calendar). Groups: each person registers individually.
- Because Verkada sends the **day-of sign-in email automatically** to anyone who pre-registered, we likely **don't need our own automated email**. Our site just links to the RSVP/registration link for each guest type.

**Site wiring:** replace the single `verkadaUrl` with two links (18+ / Under-18 RSVP links) once you create the recurring events, and the Visit/calendar CTAs can offer both. Say the word and I'll add `verkadaUrl18` / `verkadaUrlMinor` to config and split the button.
