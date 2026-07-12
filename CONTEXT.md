# Session Context — 2026-07-11

## Project Path
`/Users/ammaniel/dev-tools` (dev-dashboard + dev-launcher)

## What Was Being Worked On
Enhancing the dev dashboard (both frontpage at `localhost:1919/` and fancy dashboard at `/dashboard.html`) with quality-of-life features.

## Done ✅
- **Dev launcher auto-detect framework** from package.json (Vite/Next/Expo/Express/CRA)
- **Dashboard scan-new-projects** — scans ~/myapps/ for unlisted projects
- **Open in Finder** button on frontpage rows + dashboard DEV cards
- **OpenCode command button** on frontpage — copies "work on {key} — {path}"
- **Stop All** button (frontpage header + DEV tab quick actions)
- **Git status badges** on dashboard DEV cards (branch + dirty/clean)
- **Quick Actions bar** in dashboard DEV tab (Git Status All + Stop All Servers)
- **Recent projects tracking** — localStorage, shows 5 most recent at top of DEV tab
- **Daily Focus moved to bottom** of TODO tab, restyled as compact clean card

## Pending / Not Done
- Nothing pending — user stopped here

## Decisions Made
- Frontpage (`/`) is served by `renderPage()` in `dev-dashboard/index.js` — raw Node.js
- Fancy dashboard (`/dashboard.html`) is a static HTML file with client-side JS
- New API endpoints: `/api/open-finder`, `/api/dev-git-status`, `/api/dev-batch-kill`
- Port 1919 has an auto-restart mechanism (launchd or similar) — killing and restarting immediately
- Dark mode toggle persists via localStorage

## Files Modified
- `dev-dashboard/index.js` — 3 new API handlers + frontpage row buttons + Stop All
- `dashboard.html` — Open Finder, git badges, quick actions, recent projects, daily focus restyle/reposition

## Next Steps to Resume
- User may want more dashboard improvements or to move to other projects
- Review `ready-to-deploy.md` for deployment status of any app
