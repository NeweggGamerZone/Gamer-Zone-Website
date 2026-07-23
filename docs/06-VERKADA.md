# Verkada Pre-Registration — Daily Link Automation

Goal: retire the reservation page and let guests pre-sign a **Verkada guest link** so check-in is instant. The link rotates roughly **twice a week**, so it needs refreshing. Two ways to keep it current:

## A. Manual (always available)

1. In Verkada Command, open the Gamer Zone guest site and copy the current web sign-in URL.
2. Run: `python scripts/update_verkada.py "PASTE_URL_HERE"`
   - This writes `verkadaDailyUrl` + today's date into `data/config.json`.
3. Commit/push. The site's Visit CTA now uses it.
4. To fall back to the static link: `python scripts/update_verkada.py --clear`

Or just tell Cowork: *"Here's today's Verkada link: … — update the site."*

## B. Headless (Cowork scheduled task, ~2×/week)

A scheduled Cowork task can grab the link automatically using the Claude-in-Chrome tools:

1. One-time: sign in to `newegg.command.verkada.com` in the Chrome profile Claude controls (Verkada login/SSO — done by you; Claude never stores credentials).
2. Scheduled task prompt (e.g. Tue & Fri, 9:00 AM):
   > "Open the Newegg Gamer Zone guest site in Verkada Command, copy the current guest web sign-in URL, then run `python scripts/update_verkada.py "<url>"` in the Gamer Zone Website folder and push."
3. If the session is logged out or the link can't be read, the task should message Eric to paste it manually (option A) — the site keeps working on the static fallback meanwhile.

## Visit CTA priority (implemented in `assets/js/main.js`)

1. `verkadaDailyUrl` **if** `verkadaDailyDate == today` → today's live sign-in
2. else static `verkadaUrl` (guest site)
3. else `reservationUrl` (Newegg reservation — legacy fallback)

Walk-ins are always welcome; pre-registration only skips the line.

> Ready to enable option B on a schedule? Say the word and I'll set up the recurring task (after you've logged into Verkada in the Chrome profile).

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
