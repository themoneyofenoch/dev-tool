# Dev Tools — Ammaniel Command Center

> Built: 2026-07-09 | Port: 1919 | URL: http://localhost:1919/dashboard.html

## What It Is

A single-page dashboard for managing all ~23 Ammaniel projects. Tracks health phases, todos, publish metadata, marketing content, agent configs, dependency insights, and dev server status — all in one browser tab.

## Architecture

```
dev-tools/
├── dashboard.html          # Command Center UI (2180 lines, embedded CSS/JS)
├── dashboard-data.json     # Project data — source of truth (shared with OpenCode)
├── start-dashboard.command # Launcher — opens browser, no server needed anymore
├── open-dashboard.sh       # Wait-for-server-then-open-browser script
├── dev-dashboard/
│   └── index.js            # Node.js HTTP server on :1919 (no dependencies)
├── webindexer/             # Website analyzer (spawned by server)
├── deploy-setup/           # Hostinger deploy helper
├── dev-launcher/           # CLI dev launcher
├── dev-stop/               # Kill-all-dev-servers tool
├── create-app/             # Project scaffolding
└── icon-maker/             # App icon generator
```

## Server (`dev-dashboard/index.js`)

Pure Node.js — zero dependencies. Serves:

| Route | Purpose |
|-------|---------|
| `GET /` | Original dev dashboard (project table with Open/Stop) |
| `GET /dashboard.html` | Command Center UI |
| `GET /dashboard-data.json` | Project data JSON |
| `GET /api/status` | Port status for all projects |
| `POST /api/stop` | Kill process on a port |
| `POST /api/progress/save` | Save todo progress to dashboard-data.json |
| `POST /api/webindexer/inspect` | Analyze a single URL |
| `POST /api/webindexer/crawl` | Crawl and map a website |

## Auto-Start (Login)

Two LaunchAgents ensure zero-click startup:

1. **`com.ammaniel.devdashboard.plist`** — Starts the Node.js server on port 1919. `KeepAlive: true` restarts it if it crashes.

2. **`com.ammaniel.dashboard-open.plist`** — Runs `open-dashboard.sh` which waits for the server to be ready, then opens the browser to the dashboard.

Both live in `~/Library/LaunchAgents/`.

## Dashboard Tabs

| Key | Tab | What It Shows |
|-----|-----|---------------|
| `1` | DASHBOARD | Daily focus, all project todos, project overview grid |
| `2` | PROJECTS | Phase tracker, AI actions, bugs, quick links, Ammaniel/OpenCode todos |
| `3` | PUBLISH | App Store/Play Store metadata editor with AI fill, IAP manager |
| `4` | MARKETING | About text, keywords, social media post planner |
| `5` | AGENTS | AGENTS.md summary: stack, MCPs, deploy method, auth |
| `6` | INSIGHTS | Dependencies, env vars, git status, competitor comparison, web indexer |
| `7` | DEV | **Dev Launcher** — all 25 projects with live port status |

## Dev Launcher Tab (Key `7`)

Shows all 25 projects as cards. Each card has:

- **Live status dot** — green (running) or gray (stopped), detected by probing `localhost:{port}`
- **Framework badge** — color-coded: Vit (Vite/green), Nxt (Next.js/purple), Exp (Express/blue), Dash (orange)
- **🌐 Open** — opens the app in a new browser tab
- **🚀 Start** — copies `cd "{path}" && npm run dev` to clipboard
- **🛑 Stop** — copies `lsof -ti:{port} | xargs kill -9` to clipboard
- **📋** — copies the project path
- **🔄 Check All** — re-probes all 25 ports

## Auto-Refresh

The dashboard polls `dashboard-data.json` every **15 seconds**. When OpenCode updates the JSON (e.g., marking todos done), the dashboard detects the change and re-renders the current tab — no page refresh needed.

When you toggle a todo in the dashboard, it saves to both `localStorage` (instant UI) and `dashboard-data.json` (via `POST /api/progress/save`) so OpenCode sees the update.

## How OpenCode Uses It

OpenCode reads/writes `dashboard-data.json` to populate and update project data:

```
"populate kalkidan dashboard" → explore agent scans project → updates dashboard-data.json
→ dashboard auto-refreshes within 15s → user sees new data
```

The `aiActions` array drives the "🧠 AI Says — Do This Next" section. The `ammanielTodos` and `opencodeTodos` arrays drive the todo lists.

## Port Map

```
2222  GeezEasy        (Vite)      3333  Latin Dance Hub  (Next.js)
4500  Kalkidan        (Vite)      5555  Salon Booking    (Next.js)
6677  Habesha Wedding (Next.js)   7777  Nakfa Marketplace(Next.js)
9999  WeThePeople     (Express)   1111  Ethiocoffee      (Vite)
1212  AgeLBook        (Next.js)   1313  Gottasee         (Vite)
1414  Ammaniel Hintza (Vite)      1515  Ammanuniverse    (Vite)
1616  EthioRemit      (Next.js)   1717  Customer Pages   (Vite)
1919  Dev Dashboard   (Dashboard) 8888  VibeCode         (Next.js)
2020  AppPub FE       (Vite)      2021  Libi             (Vite)
2028  Addis Connect   (Next.js)   2023  OnMe             (Next.js)
2024  Event Photos    (Next.js)   2027  Pixwee           (Vite)
2029  Bahlina         (Vite)      2030  NakfaAI          (Express)
3456  AppPub BE       (Express)
```

## Quick Commands

```bash
# Open dashboard
open http://localhost:1919/dashboard.html

# Restart server (if needed)
launchctl stop com.ammaniel.devdashboard
launchctl start com.ammaniel.devdashboard

# Check server status
curl -s http://localhost:1919/api/status | python3 -m json.tool | head -20
```
