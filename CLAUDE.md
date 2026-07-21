# CLAUDE.md — project guide for Claude Code (and humans)

This file is auto-loaded by Claude Code. It tells you (and any AI agent) how this
project is built so you can make changes safely.

## What this is
**CricWorldScores** — a free, real-time cricket scoring web app.
- One person scores a match; everyone else opens the link and watches live.
- Live at **https://cricworldscores.web.app**.
- Backend is **Firebase** (Firestore + Hosting), free (Spark) tier.

## Architecture — read this before editing
- **The entire app is one file: `index.html`.** HTML + CSS + vanilla JS, no build step,
  no framework, no bundler. You edit it and deploy it as-is.
- **Firebase Web SDK v10 (compat)** is loaded from a CDN in `index.html`. `firebase-config.js`
  holds the project's public web config.
- **Data is in Firestore**, one document per entity. The app subscribes with `onSnapshot`,
  so every client updates in real time. Writing a whole document re-renders all viewers.
- **No server code.** All logic (scoring engine, stats, UI) runs in the browser.

### Firestore collections
- `matches/{id}` — a full match (teams, innings, ball-by-ball deliveries, result).
- `leagues/{id}`, `seasons/{id}` — optional League → Season grouping. A match with
  `leagueId: null` is "standalone" and shows on the front page.
- `teams/{slug}` — persistent team rosters; players carry a **stable `id`** so career
  stats aggregate across matches.
- `practices/{id}` — throwaway solo net sessions (no records, deletable by anyone).

### The scoring engine
- `derive(match, innings)` is the heart of it: it walks the `deliveries[]` array and
  computes the full state (scores, batsman/bowler cards, strike, current over, etc.).
  **Everything is derived from the delivery log** — so undo = pop the last delivery.
- Players are referenced by stable **id** everywhere; names are display-only
  (`pName(match, id)` resolves a name).
- `derivePractice(practice)` is the equivalent for practice mode.

### Backdrop photos
- On load, `loadBackdrop()` fetches random cricket photos from **Wikimedia Commons** and
  **Openverse** (both free/CC, CORS-friendly) and shows them as a retro collage.
- Dravid & Chappell are bundled locally in `assets/` and always present; the Dravid frame
  rotates through 100+ fetched photos.

## Files
| File | Purpose |
|---|---|
| `index.html` | The whole app |
| `firebase-config.js` | Firebase web config (public — safe to commit) |
| `firebase.json`, `.firebaserc` | Hosting + project config for `firebase deploy` |
| `firestore.rules` | Security rules (currently open — see caveat) |
| `assets/` | Local fallback photos + image credits |
| `seed.mjs`, `migrate.mjs`, `clearTeams.mjs` | One-off Node scripts for demo data / cleanup |

## Running & deploying
There is **no build**. To preview locally you must serve over http (Firebase blocks `file://`):
```bash
firebase emulators:start        # or: python3 -m http.server 8080
```
To deploy (needs access to the Firebase project — ask the maintainer to add you):
```bash
firebase deploy --only hosting        # app only (most common)
firebase deploy --only firestore:rules # if you changed firestore.rules
```

## Conventions / gotchas
- Keep it a **single file** with **no dependencies/build step** — that's the whole point.
- Match the existing vanilla-JS style (small helper functions, `onSnapshot` for live data).
- After editing `index.html`, sanity-check the script parses:
  `awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/cs.js && node --check /tmp/cs.js`
- **Security caveat**: `firestore.rules` is open (`allow read, write: if true`) and PIN checks
  were removed — anyone can read/write. Fine for a friends' app; do NOT put private data here.
- The Firebase web API key in `firebase-config.js` is **not a secret** (it ships to every
  browser) — committing it is expected.

## Data model quick reference
```
match = { id, venue, date, status:'setup'|'live'|'done', createdAt,
          leagueId|null, seasonId|null, seasonName,
          teams:{A:{name,players:[{id,name}]}, B:{...}},
          oversPerInnings, currentInnings, innings:[inn,inn], result, playerIds:[] }
inn   = { batting:'A'|'B', bowling, overs, strikerInit, nonStrikerInit, deliveries:[d], closed }
d     = { bowler, runs, extra:null|'wide'|'noball',
          wicket:null|{type, out:'striker'|'nonstriker', catcher}, newBatsman }   // ids not names
```
