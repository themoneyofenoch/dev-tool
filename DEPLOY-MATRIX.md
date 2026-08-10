# Deploy Matrix — all Ammaniel projects (verified 2026-08-10)

Goal: **push to GitHub main → Hostinger auto-deploys.** One-time hPanel step per site, then forever automatic.

## Node.js Web Apps (Hostinger hPanel pipeline — auto-deploy capable)

| Site | Repo (branch main) | Entry file | Package mgr (hPanel) | GitHub connected |
|---|---|---|---|---|
| nakfaai.com (/, /dashboard, /hintza) | themoneyofenoch/nakfaai | server.js | npm → **set pnpm** | ❌ connect |
| geezeasy.com | themoneyofenoch/geezeasy | dist/index.js | npm → **set pnpm** | ❌ connect |
| kalkidan.app | themoneyofenoch/kalkidan | dist/index.js | npm → **set pnpm** | ❌ connect |
| ammanielhintza.com | themoneyofenoch/ammanielhintzacom | server.js | npm → **set pnpm** | ❌ connect |

**hPanel path (per site):** Websites → {domain} → Node.js app → Connect to GitHub (authorize, pick repo, branch main) → Deploy settings: **Package manager = pnpm** → Deploy.
**Verify from CLI:** `gh api repos/{owner}/{repo}/hooks` must show a Hostinger webhook.

## Static / PHP sites (public_html — GitHub deploy NOT automatic unless connected)

| Domain | Repo (if any) | Notes |
|---|---|---|
| pixwee.com | themoneyofenoch/pixwee | static — verify deploy method |
| agelbook.com | themoneyofenoch/agelbook | static — verify deploy method |
| latindance.ai | themoneyofenoch/latindance | static — verify deploy method |
| habesha-wedding.com | themoneyofenoch/habeshawedding_platform | static — verify deploy method |
| ammanuniverse.com | themoneyofenoch/ammanuniverse | static — verify deploy method |
| gottasee.com | themoneyofenoch/gottasee | static — verify deploy method |
| onme.nakfaai.com | themoneyofenoch/onme | static — verify deploy method |
| vibecode.com | themoneyofenoch/vibecode | static — verify deploy method |
| apppub | themoneyofenoch/apppub | app + server — verify deploy method |

## Local dev (not deployed)
GeezEasy local, Latin Dance Hub, Salon Booking, Habesha Wedding, Nakfa Marketplace, WeThePeople, Ethiocoffee, Genzeb/EthioRemit, Libi, Addis Connect, Event Photos (Medusa), Bahlina — no live domain, no repo needed yet.

## Rules that apply to EVERY project (from ~/.zcode/AGENTS.md)
- **pnpm ONLY** — hPanel package manager must be pnpm, never npm.
- One GitHub account per hosting plan; repo per site; branch main.
- ZIP upload ≠ auto-deploy. GitHub connect = webhook on repo (verify with `gh api .../hooks`).
- Dashboard specifics: see `~/.zcode/AGENTS.md` → "Command Center dashboard — global rules for ALL agents".
