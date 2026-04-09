# R-M Home Tool — Deployment

## What's in this folder

```
rm-home-deploy/
├── index.html                    # App shell
├── package.json                  # Dependencies (React, Vite)
├── vite.config.js                # Build config
├── netlify.toml                  # Netlify build + routing config
├── netlify/
│   └── functions/
│       └── claude.js             # API proxy — keeps key server-side
└── src/
    ├── main.jsx                  # React entry point
    └── App.jsx                   # The full R-M Home Tool
```

---

## One-time setup — 15 minutes

### Step 1 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`) — you only see it once

**Cost:** For typical family use (Why tool, report ingestion, self-discovery synthesis, pattern insights, daily Spock assessments), expect **under $1/month** at current pricing. The Spock consultation flow is entirely offline — no API cost.

---

### Step 2 — Deploy to Netlify

**Option A: Drag and drop (fastest)**

1. Run the build locally:
   ```bash
   cd rm-home-deploy
   npm install
   npm run build
   ```
2. Go to [netlify.com](https://netlify.com) → sign in → **Add new site** → **Deploy manually**
3. Drag the `dist/` folder onto the upload area
4. Your site is live at a Netlify URL (e.g. `random-name-123.netlify.app`)

**Option B: GitHub (recommended for ongoing updates)**

1. Create a new GitHub repository (private is fine)
2. Push this entire `rm-home-deploy/` folder to it:
   ```bash
   cd rm-home-deploy
   git init
   git add .
   git commit -m "R-M Home Tool initial deploy"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
4. Connect to GitHub, select the repository
5. Build settings (Netlify auto-detects from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click **Deploy**

Future updates: push to GitHub → Netlify auto-rebuilds. No manual steps.

---

### Step 3 — Add the API key (required for AI features)

After deployment:

1. In Netlify dashboard → your site → **Site configuration** → **Environment variables**
2. Click **Add a variable**
3. Key: `ANTHROPIC_API_KEY`
4. Value: your key from Step 1 (paste the full `sk-ant-...` string)
5. Click **Save**
6. Go to **Deploys** → **Trigger deploy** → **Deploy site** (to pick up the new variable)

**The AI features that need this:** Why tool, report ingestion, self-discovery synthesis, pattern insight, Spock's situational assessment. The main Spock consultation flow (zone → L1 → L2 → guidance) is fully offline and works without it.

---

### Step 4 — Set a custom URL (optional)

In Netlify → **Domain management** → **Options** → **Edit site name** — change `random-name-123` to something like `rm-family` → your URL becomes `rm-family.netlify.app`.

For a fully custom domain (e.g. `family.yourdomain.com`), Netlify's Domain management handles this with step-by-step DNS instructions.

---

## Accessing the tool

Once deployed, SR and DM can:

- Open the URL on any device — iPhone, Android, desktop, tablet
- **Add to home screen on iOS:** tap Share → Add to Home Screen → it opens like a native app
- **Add to home screen on Android:** tap the three-dot menu → Add to Home Screen

No login. No accounts. No tracking. Data stays on each device (local storage). Use **Save Progress** / **Restore** in the app to back up and sync between devices.

---

## Keeping the API key secure

- The key is stored only in Netlify's environment variables — never in the app code
- The browser never sees the key — requests go to `/.netlify/functions/claude` and the proxy adds the key server-side
- The repository can be public with no security risk

---

## Updating the app

When a new version of `App.jsx` is ready:

1. Replace `src/App.jsx` with the new file
2. If using GitHub: `git add . && git commit -m "Update" && git push` → Netlify auto-deploys
3. If using drag-and-drop: run `npm run build` again and re-upload `dist/`
