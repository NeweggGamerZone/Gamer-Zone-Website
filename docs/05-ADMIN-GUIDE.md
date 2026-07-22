# Admin Guide — Wall Moderation & Site Management

## 1. The hidden admin page

URL: `/gz-ops-review.html` — not linked anywhere on the site. Bookmark it on the kiosk tablet and your machines only.

**Password:** default is `GZFreePlay2026!` — **change it before pushing publicly.** To change: run `python scripts/hash_password.py "YourNewPassword"` and paste the printed hash into `PASS_HASH` at the top of `assets/js/admin.js`.

> ⚠ Honest security note: this is client-side gating — it deters casual visitors, it does not stop a determined person from reading *pending* posts on that same device. Publishing is still safe: nothing appears on the live site without you committing `posts.json` to the repo. Never reuse a real password here.

## 2. Moderation flow (v1)

Submissions are stored in the **browser's localStorage of the device where they were made**. This makes the in-Zone kiosk the primary intake:

1. Visitor taps "Sign the Wall" on wall.html (kiosk) → post goes to that device's pending queue.
2. You open `gz-ops-review.html` **on the same kiosk device**, enter password.
3. Review each pending post → ✅ Approve / ❌ Reject (rejected are deleted).
4. Click **Export posts.json** → downloads the merged file (existing approved + newly approved).
5. Replace `data/posts.json` in the repo and push (or hand the file to Cowork: "replace posts.json and push").

**Remote submissions:** the site points remote users to Discord `#gz-wall`. You copy good ones into the admin page via the "Add post manually" form (mark 🌍 remote), then export/publish as above. This keeps you in full control with zero external services. (v2 upgrade path: Supabase free tier gives a real global queue — the admin page is already structured for it.)

## 3. Post format (`data/posts.json`)

```json
{
  "posts": [
    {
      "id": "p-20260718-001",
      "type": "note",              // note | meme | prize | lfg | tech
      "text": "First visit — the Omni One melted my brain. Coming back Saturday!",
      "name": "PixelPusher88",
      "date": "2026-07-18",
      "remote": false,             // true = 🌍 badge
      "color": "yellow",           // yellow | pink | blue | green | orange (sticky color)
      "image": ""                  // optional, for memes/prize pics: assets/img/wall/...
    }
  ]
}
```
Meme/prize images: save to `assets/img/wall/` and reference the path. Keep images family-friendly; you are the filter.

## 4. Moderation policy (suggested)

Approve: positive notes, memes, prize brags, LFG, tech tips.
Reject: profanity/slurs, personal contact info (phone/email — protect guests' privacy), spam/ads, anything targeting a person, off-brand negativity. When unsure, reject — the wall's warmth is the product.

## 5. Routine site management

- Hours/links/banner: edit `data/config.json`.
- Events: edit `data/events.json` (see 03-CONTENT-OPS.md).
- Calendar images: drop-folder workflow (03-CONTENT-OPS.md).
- Everything publishes via git push; Pages is live ~1 min later.

## 6. GitHub Pages setup (one-time)

1. Push repo to `NeweggGamerZone/Gamer-Zone-Website`, branch `main`.
2. Repo → Settings → Pages → Source: "Deploy from a branch" → `main` / root.
3. Repo → Settings → Actions → allow workflows (for the manifest builder), and give the workflow write permission (Settings → Actions → General → Workflow permissions → Read and write).
4. Site appears at `https://neweggamerzone.github.io/Gamer-Zone-Website/` (custom domain optional later).

**Credentials note:** never paste tokens into chats or commit them. Use `git push` with a fine-grained PAT entered at the prompt, or GitHub Desktop / `gh auth login`.
