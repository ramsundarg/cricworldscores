# 🏏 CricWorldScores

A free, real-time cricket scoring web app. **One person scores, everyone watches live** from their own phone.

**▶ Live: https://cricworldscores.web.app**

- **$0/month** — runs entirely on Google Firebase's free (Spark) tier.
- **No server, no static IP, no "always-on Mac".** Firebase hosts it; everyone opens a link.
- **Live** — scores update on all viewers' phones instantly.
- **Single file, no build step** — the whole app is `index.html`.
- **History + CSV export** — every match is saved; export to CSV and drop into Google Sheets.

> 👥 **Want to co-work on this?** See [CONTRIBUTING.md](CONTRIBUTING.md).
> Using Claude Code? It auto-reads [CLAUDE.md](CLAUDE.md) for full project context.

---

## What it does

1. **New Match** — venue, date, both team names + player lists, overs, optional scorer PIN.
2. **Innings setup** — pick batting/bowling side, striker, non-striker, opening bowler.
3. **Live scoring** — buttons for `0 1 2 3 4 6`, `Wide`, `No-ball`, `OUT`, `Undo`.
   - `OUT` asks dismissal type (bowled / caught / lbw / run out / stumped), who's out, catcher (if caught), and the new batsman.
   - Strike rotates automatically on odd runs and at the end of each over.
   - Prompts for the next bowler at each new over (can't bowl two in a row).
   - Live score, overs, run-rate, target/required (2nd innings) shown at the top.
4. **Viewers** open the same link and see a read-only live scoreboard.
5. **Result + full scorecard**, plus **CSV export** for Google Sheets.

---

## One-time setup (~5 min, all free)

### Step 1 — Create a Firebase project
1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. **Add project** → give it a name (e.g. `cricket-scorer`) → you can disable Google Analytics → **Create**.

### Step 2 — Add a Web App and copy the config
1. In the project, click the **`</>`** (Web) icon to "Add app to get started".
2. Give it a nickname → **Register app**.
3. It shows a `firebaseConfig = { ... }` block. Copy those values into **`firebase-config.js`** in this folder (replace every `PASTE_ME`).

### Step 3 — Enable Firestore
1. Left menu → **Build → Firestore Database → Create database**.
2. Choose a location → start in **production mode** (the included `firestore.rules` opens access for this app; see note below).

### Step 4 — Install the Firebase CLI (once)
```bash
npm install -g firebase-tools
firebase login
```

### Step 5 — Deploy
From inside this `cricket-scorer/` folder:
```bash
firebase use --add          # pick the project you created
firebase deploy
```
When it finishes it prints a **Hosting URL** like:
```
https://cricket-scorer-xxxx.web.app
```
**That's your app.** Share it with the team. Done — no fees, always online.

> Tip: to re-deploy after any edit, just run `firebase deploy` again.

---

## Try it locally first (optional)
You can't open `index.html` with `file://` because browsers block Firebase there. Serve it:
```bash
firebase emulators:start   # or:  python3 -m http.server 8080
```
…then open the printed local URL.

---

## Structure: Leagues → Seasons → Matches

Matches are organised under **Leagues** and **Seasons**:
- **Home** lists leagues. Create a league with a **league PIN** (letters and/or numbers).
- Open a league → add **Seasons**. Open a season → add **Matches**.
- **Teams & Player stats** (global, shared across all leagues) is still reachable from Home.

### PINs & who can delete
- **Deleting** anything in a league (a match, an empty season, an empty league) requires that **league's PIN**. Creating and scoring don't need it.
- Leagues/seasons can only be deleted when empty (delete the matches first) — a guardrail against wiping data by accident.
- **Removing a player** from a (global) team requires the **admin PIN**.
- The **admin PIN** can reset any league PIN and authorise any delete. It is **never stored** — only a SHA-256 hash of it lives in the code, and only you know the value.
- **Change/reset a league PIN**: open the league → ⚙ → *Change / reset PIN* (needs the current league PIN, or the admin PIN).

> ⚠️ **Security reality**: because the app is static (no server on the free tier), these PIN checks run in the browser and are a deterrent against casual/accidental deletes — not bulletproof security. True server-enforced protection needs the paid Blaze tier + Cloud Functions.

## Seeding demo data (optional)
`migrate.mjs` creates a **Default League** (PIN: `default`) + a **2026 Season**, moves any pre-existing matches under it, and adds a few completed dummy matches so stats/leaderboards look populated:
```bash
npm install firebase        # once
node migrate.mjs
```
Change the Default League's PIN afterwards from the app (league → ⚙).

## Notes & limits (kept simple on purpose)

- **Scorer PIN** (per match) is separate from the league PIN — it's light protection so viewers don't accidentally tap scoring buttons.
- **Wides / no-balls**: each adds 1 run and is re-bowled (a no-ball can also carry runs off the bat). Byes/leg-byes aren't separated yet.
- **Free-tier headroom** is huge for this: a full match is a few hundred tiny writes; Firestore's free quota is 20,000 writes/day.
- **History**: every match stays in Firestore and on the home screen. Use **Export CSV** to archive into Google Sheets.

## Ideas to add later
- Byes/leg-byes and free-hit handling
- Player career stats across matches
- Auto-push each finished match into a Google Sheet (Apps Script webhook)
- Manhattan/worm charts on the summary page
