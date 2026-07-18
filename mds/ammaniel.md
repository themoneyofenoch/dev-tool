# Ammaniel's Instincts & Preferences

> Every agent that works for Ammaniel reads this file at boot. It's not system rules — it's who he is. This file auto-updates — when I express a new preference or correct an instinct, agents add it here without being asked.

---

## Connected Services

| Service | Status | Details |
|---------|--------|---------|
| **App Store Connect** | ✅ Connected | Issuer: `0418454e-4e54-4fc7-a387-b3b2460fd5e8`, Key ID: `P86FHT4K54` |
| **Google Play Console** | ✅ Connected | Service account: `play-publisher@smooth-reason-498321-g1.iam.gserviceaccount.com` |
| **Firebase** | ✅ Connected | Project: `geezeazy-69c5c`, API Key: `AIzaSyA8RRgV1j9U-bSgkFbCd3q3grrRqq0RHT0` |
| **GitHub** | ✅ Connected | Repos: `themoneyofenoch/opencode-config`, `themoneyofenoch/opencode-dotconfig` |
| **Hostinger** | ✅ Connected | API + SSH available. Primary deploy method. |

---

## Trust Boundaries — Never Cross These
- I approve all deploys. No exceptions. Show me the command, wait for "go."
- I approve all store submissions (App Store, Google Play). No exceptions.
- I approve all domain registrations and DNS changes. No exceptions.
- Never use `rm -rf`, `rsync --delete`, or `git reset --hard`. Propose the command, wait for approval.
- Never push code unless I say so. Never force-push or amend without explicit request.

---

## Deployment — Hostinger

**Primary method: Hostinger API MCP** (preferred for Node.js apps)

| Tool | When |
|------|------|
| `hostinger-api_hosting_deployJsApplication` | Node.js apps — zip, auto-detect build, deploy |
| `hostinger-api_hosting_deployStaticWebsite` | Static sites — pre-built files |
| `hostinger-api_hosting_listJsDeployments` | Check deployment status |
| `hostinger-api_hosting_showJsDeploymentLogs` | Debug build failures |

**SSH is available but ASK FIRST.**

- **SSH access:** `ssh -p 65002 -i ~/.ssh/ammaniel-deploy u885017975@45.89.204.208`
- **Path:** `~/domains/{site}/public_html/`
- **Rule:** Never SSH without asking. Propose the command, wait for approval.

**Environment variables:**
- Live in hPanel → Node.js App → Environment Variables
- Agents never SSH in to create `.env` files on the server
- Agents never touch Hostinger's environment — that's Ammaniel's job

**PM2:**
- `pm2 kill && pm2 start ecosystem.config.js` — use this
- NEVER `pm2 restart` — it doesn't reload code

**Before any deploy:**
1. Confirm "is this the right repo?" with me
2. Propose the command (API or SSH)
3. Wait for "go"

---

## Commands

| Command | Action |
|---------|--------|
| `/wapp` | **Web App** — deploy to Hostinger via API |
| `/iapp` | **iOS App** — build for App Store via Publisher MCP |
| `/gapp` | **Google App** — build for Google Play via Publisher MCP |
| `/fapp` | **Firebase App** — configure Firebase (generate plist/json via AppPub) |
| `/ghapp` | **GitHub App** — commit + push to GitHub |
| `/status` | Check status of all connected services |
| `/keys` | Check credential validity (Apple, Google, Firebase) |
| `/help` | Show available commands |

---

## Design Instincts
- **Borderless. Clean. Minimal.** No heavy borders, no clutter. White space is intentional.
- **Gradient buttons** — subtle gradients for primary CTAs. Clean gradient, not heavy. Borderless buttons with soft rounded corners.
- **Accent colors for emphasis.** Not decoration — signaling. One accent, used sparingly.
- **Mobile-first always.** Breakpoints: 375, 480, 768, 1024. Desktop-only layouts are never shipped.
- **Consistency is law.** Identical elements MUST have identical behavior, identical styling, identical features. If you fix box 1 and boxes 2-4 are identical, fix all four. Don't wait to be told.
- **Simple and logical.** No over-engineering. The simplest solution that works. If it needs explanation, it's too complex.
- **Spacing and typography consistent.** Every page, every component. Same rhythm, same hierarchy.

---

## Tech Preferences
- **OpenCode via Homebrew only.** Never use npm or other package managers for installing/upgrading OpenCode. `brew upgrade opencode` only. (Added 2026-07-03 — npm install created a conflicting version.)
- **Firebase Auth standard** — Google, Apple, Email, Phone. Every app. No exceptions.
- **Tailwind over CSS modules.** Utility classes for layout/spacing. Extract to components for reuse.
- **TypeScript preferred.** Shared types in `types.ts` or `types/` directory.
- **Imports grouped:** external libs → internal modules → styles. Absolute paths where supported.
- **Secrets never leave the code repo.** Never hardcode API keys. Never suggest `.env` files for production. Hostinger uses hPanel Environment Variables — upload them there, not in the code.
- **DIVISION OF LABOR — env vars:** Agents handle the LOCAL `.env` for dev. Ammaniel ALWAYS uploads env vars to Hostinger hPanel manually. ALWAYS. Agents never SSH in to create .env files on the server. Agents never touch Hostinger's environment. That's Ammaniel's job — full stop.

---

## Deployment Instincts
- **Hostinger API first.** For Node.js apps, use `hostinger-api_hosting_deployJsApplication`. For static, use `hostinger-api_hosting_deployStaticWebsite`.
- **SSH only if API fails or for one-off tasks.** Always ask first.
- **Hostinger auto-deploys from GitHub.** Connect the repo in hPanel → Auto Deploy. Push to GitHub, Hostinger pulls and builds automatically. No GitHub Actions workflow needed. No manual SCP. No custom CI/CD.
- **Environment variables live in hPanel, not in `.env` files.** Never create `.env` files for production. Never ask "do you have a `.env` file?" for deploys. All config goes into Hostinger's Environment Variables panel.
- **PM2 restart:** Always `pm2 kill && pm2 start ecosystem.config.js`. NEVER `pm2 restart` — it doesn't reload code.
- **Before any deploy:** Confirm "is this the right repo?" with me. Propose the command. Wait for "go."
- **Push only when I tell you.** Hostinger auto-deploy handles the rest — no other way.

---

## Gut Calls That Were Right
- **20 OMO workers** — felt wrong, reverted to 5. Docs later confirmed: recommended is 4, max safe is 5 for DeepSeek V4.
- **deepseek-chat and deepseek-reasoner** — felt like dead weight. Removed them. System got faster, fallback chains work correctly.
- **Two config files for OMO** — felt redundant. Consolidated into one. Still have two config repos (by design), but now one source of truth.
- **Agent Intelligence stack** — instinct that agents need more than just code. Built 16 layers: boot sequence, boundaries, memory, lessons, session continuity. Now agents work like Hermes for OMO.

---

## Communication Style
- **Concise.** No preamble, no postamble. One-word answers are fine when appropriate.
- **Don't explain what you checked.** Just do it. Report results, not process.
- **When asking questions with options, include your recommendation.**
- **"Just do it" means execute immediately.** Don't present a plan, just act.

---

## How I Think — Three Modes
- **Ship Fast (Founder Mode):** MVP first. What's the smallest thing that delivers value? Perfect is the enemy of shipped. If you can build it in 3 files instead of 10, build it in 3.
- **Make It Feel Right (Craftsman Mode):** If it looks ugly, users won't trust it. Empty states, loading states, errors, transitions — all matter. The first screen should make them want to stay.
- **Make It Actually Work (Engineer Mode):** Happy path is not enough. Errors should help, not blame. No spinners of death. Handle offline, slow network, fat fingers.

---

## How I Build
- **Think in systems, not files.** Bottom-up: types → data → API → logic → UI → tests. Every change atomic and testable.
- **Before writing code, ask:** Who is using this? What are they trying to do? What would frustrate them? What would delight them?
- **Plan before build** — unless I say "just do it."
- **Validate relentlessly** — lint, typecheck, test after every meaningful change. Never leave failures unfixed.
- **SEO every new page** — title, meta, OG tags, structured data, heading hierarchy, alt text.
- **Test fully** — click through the entire flow, verify all states (loading, empty, error, success).
- **Commit and push only when I say so.**
- **If I correct you**, write it to memory.md. If an approach fails, write it to LESSONS.md.

---

## The Test
Before calling anything done: would I be proud to show this? Would a non-technical person understand it? Would I use it myself? If any answer is no, it's not done.

- `ks` or `keep it short` = user wants brief, no-fluff answers (2026-06-25)

---

## Dev Tools
- **App Icon Maker** — `~/Developer/projects/dev-tools/icon-maker/index.html`. Open in browser, drop SVG, auto-scales to 95% fill. Generates 10 icon sizes (32–1024px: App Store, Google Play, favicon, etc.) + 8 device screenshots. Quality checks built in. ZIP or individual PNG download. (Added 2026-07-04)