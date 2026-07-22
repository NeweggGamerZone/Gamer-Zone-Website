# Newegg Gamer Zone Website

Static, data-driven site for the Newegg Gamer Zone — free-to-play gaming lounge at Newegg HQ, Diamond Bar, CA. Hosted on GitHub Pages.

## Routine updates (no HTML editing)

- **Calendar/theme images:** drop into `assets/calendar/monthly/` (`YYYY-MM.png`) and `assets/calendar/weekly/` (`YYYY-MM-DD.png`, Monday of the week) → push. A GitHub Action rebuilds the manifest; the site auto-shows current images and auto-archives past ones.
- **Events:** edit `data/events.json`.
- **Hours/links/banner:** edit `data/config.json`.
- **Wall posts:** moderate via the hidden admin page → export → replace `data/posts.json` → push.

Full guides in `/docs`:

| Doc | Contents |
|---|---|
| `01-PRD.md` | Product requirements, audiences, feature roadmap |
| `02-UX-FLOWS-AND-IA.md` | Personas, sitemap/UI map, ideal customer flows |
| `03-CONTENT-OPS.md` | Image drop-folder workflow, Cowork task prompts |
| `04-COMMUNITY-ACTIVATIONS.md` | In-room + global activation playbook |
| `05-ADMIN-GUIDE.md` | Wall moderation, admin password, Pages setup |

## Local preview

Any static server from the repo root, e.g. `python -m http.server 8000` → http://localhost:8000 (fetch() needs a server; opening index.html from disk won't load JSON in some browsers).

## Security

Never commit tokens or credentials. The admin page password is client-side obfuscation only — publishing always requires repo write access.
