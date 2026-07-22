# Content Operations Guide — How to Update the Site

Routine updates require **zero HTML editing**. You paste images into folders and (optionally) edit one JSON file. Everything else is automatic.

---

## 1. Image Drop Folders

| Folder | What goes in | Naming convention |
|---|---|---|
| `assets/calendar/monthly/` | Monthly calendar graphic | `YYYY-MM.png` (e.g. `2026-07.png`) |
| `assets/calendar/weekly/` | **Per-event flyers** | `YYYY-MM-DD-slug.png` — date = event day (e.g. `2026-07-23-fps-day.png`) |

Rules: PNG or JPG. Overwrite the same filename to fix. The date prefix is what matters.

**How flyers connect to events (v2):** each event in `data/events.json` has a `flyer` path and an `accent` color. If the flyer image exists, the site shows it; if not, the site renders a styled fallback flyer card from the event data (day/date/time/title in GZ flyer style) — so the lineup is never blank. Drop the PNG → the image takes over automatically. Expected filenames for the current lineup are already in events.json.

**Biweekly cycle (your creation cadence):** drop the next monthly (when new month approaches) + the next two weekly images, then push. Done.

## 2. What happens automatically

1. On every push, a GitHub Action (`.github/workflows/build-manifest.yml`) runs `scripts/update_manifest.py`, which scans the two folders and rewrites `data/calendar-manifest.json`.
2. The site reads the manifest and, based on **today's date**:
   - shows the current monthly calendar and current week's theme image,
   - shows "next week" when available,
   - moves anything older into the **Archive** section on events.html, grouped by month — past events stay visible forever, no manual archiving.
3. If you update locally without pushing, run: `python scripts/update_manifest.py` from the repo root (or ask Cowork).

## 3. Reusable Cowork task prompts

- **Biweekly update:** "Scan the calendar folders in my Gamer Zone Website folder, regenerate the manifest, tell me what's current/missing for the next 2 weeks, then commit and push."
- **Event add:** "Add an event to events.json: [name, date, time, type, blurb, reservation needed?] and push."
- **Wall publish:** "Here's the exported posts.json from the admin page — replace data/posts.json and push."
- **Health check:** "Check the GZ website: is this week's theme image present? Any events in events.json that ended and should be marked featured=false? Push fixes."

Tip: a scheduled Cowork task every other Monday can run the biweekly update/health check automatically.

## 4. events.json (structured events — powers Home cards + accessibility/SEO)

```json
{
  "events": [
    {
      "id": "fantastech-lan-2026-07",
      "title": "FantasTech LAN Night",
      "date": "2026-07-24",
      "time": "5:00 PM – 9:00 PM",
      "type": "tournament",            // tournament | theme-night | vendor | edu | community | major
      "blurb": "Bring your squad. Prizes from the FantasTech vault.",
      "featured": true,                 // featured=true shows on Home
      "reservation": true,
      "image": ""                       // optional: assets/img/events/...
    }
  ]
}
```
Past-dated events automatically drop out of "Upcoming" and appear under Archive.

## 5. Other content knobs

- `data/config.json` — hours, address, links (Discord, IG, reservations), announcement banner text. Edit here, changes appear site-wide.
- `data/posts.json` — approved wall posts (managed via admin page; see 06-ADMIN-GUIDE.md).
- Venue photos → `assets/img/gallery/`, listed in `config.json.gallery`.

## 6. Publish = git push

GitHub Pages serves the `main` branch. Any push is live in ~1 minute. Nothing to build locally; the Action handles the manifest.
