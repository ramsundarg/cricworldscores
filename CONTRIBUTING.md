# Contributing to CricWorldScores

Thanks for helping out! This is a tiny, dependency-free project — easy to hack on.

## The 30-second mental model
- **The whole app is one file: `index.html`** (HTML + CSS + vanilla JS). No build, no framework.
- Data lives in **Firebase Firestore**; the app updates live via `onSnapshot`.
- If you use **Claude Code**, open the folder and it auto-reads `CLAUDE.md` for full context.

## One-time setup
1. Install the tools:
   ```bash
   npm install -g firebase-tools
   firebase login          # sign in with the Google account that has access to the project
   ```
2. Clone the repo and enter it:
   ```bash
   git clone <repo-url>
   cd cricworldscores      # (folder name may be cricket-scorer)
   ```
3. (Only needed to run the demo/seed scripts) `npm install firebase`

> **Deploy access:** to publish, your Google account must be added to the Firebase
> project `cricworldscores`. Ask the maintainer to add you: Firebase Console →
> ⚙ Project settings → **Users and permissions** → Add member (Editor).

## Run it locally
Firebase blocks `file://`, so serve over http:
```bash
firebase emulators:start      # or:  python3 -m http.server 8080
```
Open the printed URL. It talks to the **live** Firestore, so be gentle with test data
(you can delete matches from the UI).

## Make a change
1. Branch: `git checkout -b my-change`
2. Edit `index.html` (match the existing plain-JS style; keep it single-file, no deps).
3. Sanity-check the script parses:
   ```bash
   awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/cs.js && node --check /tmp/cs.js
   ```
4. Commit and push:
   ```bash
   git add -A && git commit -m "Describe your change"
   git push -u origin my-change
   ```
5. Open a **Pull Request** on GitHub. Someone reviews & merges to `main`.

## Deploying

### Automatic (default) — merge to `main`
There's a GitHub Action (`.github/workflows/deploy.yml`) that **auto-publishes to
https://cricworldscores.web.app whenever `main` is updated**. So the normal flow is just:
open a PR → get it merged → it deploys itself. Contributors need **no** Firebase access.

**One-time setup by the repo owner** (so the Action can deploy):
- Easiest: run this once locally and it wires up the service account + GitHub secret for you:
  ```bash
  firebase init hosting:github
  ```
  (Point it at this repo; let it set up the workflow / secret. You can keep the existing
  `deploy.yml`.)
- Or manually: Firebase Console → ⚙ Project settings → **Service accounts** →
  *Generate new private key* → in GitHub repo **Settings → Secrets and variables → Actions**,
  add a secret named `FIREBASE_SERVICE_ACCOUNT_CRICWORLDSCORES` with the JSON contents.

> Note: the Action deploys **hosting** only. If you change `firestore.rules`, a maintainer
> runs `firebase deploy --only firestore:rules` once (rare).

### Manual (if you have Firebase access)
```bash
firebase deploy --only hosting              # app changes (most common)
firebase deploy --only firestore:rules      # only if you edited firestore.rules
```
Live URL: **https://cricworldscores.web.app**

## House rules
- **Keep it single-file & buildless.** No npm dependencies in the app itself.
- **Don't store anything private** — Firestore rules are open; anyone can read/write.
- The Firebase key in `firebase-config.js` is public by design (it ships to browsers) — leave it.
- Small PRs, clear messages. Have fun. 🏏
