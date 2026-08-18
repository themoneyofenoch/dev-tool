# Lessons Learned — dev-tools

Accumulated lessons from real bugs fixed in this workspace. Keep this updated.

## Dashboard (command-center / dashboard.html)

### 1. deleteItem runs BOTH callbacks — remove-then-reinsert = no-op delete
- **Symptom:** Delete buttons did nothing (bugs wall, Todo Board items, Quick Todo, board templates).
- **Root cause:** deleteItem(markFn, saveFn) called markFn() (removes item) **and** saveFn() (re-inserts it at the same index). A stale undo-hook got executed immediately after a save-engine refactor (commit 39eff14).
- **Fix:** only run the delete action: function deleteItem(markFn, saveFn) { markFn(); showTrashToast(); }
- **Lesson:** when a "delete" appears to do nothing, suspect a remove-then-restore pair running back-to-back. Grep the helper, don't assume the button is miswired.

### 2. Project card click never called onProjectChange() → selection not persisted
- **Symptom:** "I am on Pixwee, but if I reload the page I have to go back there."
- **Root cause:** clicking a project card only did projectSelect.value = k; switchTab('dashboard') — it never saved ammaniel-current-project. Only the header dropdown (which calls onProjectChange()) persisted it.
- **Fix:** card onclick now also calls onProjectChange(); before switchTab('dashboard').
- **Lesson:** every navigation path that changes a persisted "current" value must go through the same setter. Audit onclick handlers for direct .value = assignments that skip the save.

### 3. Bugs wall: plain Enter must save; Shift+Enter = new line
- **Symptom:** typing a bug and pressing Enter did nothing (only Cmd/Ctrl+Enter added).
- **Fix:** textarea handler is now if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addBug()} — Enter adds, Shift+Enter inserts a newline (multi-line paste still works via the + ADD button).
- **Lesson:** on multi-line inputs, Enter-to-submit is the expected default; Shift+Enter is the escape hatch for newlines.

### 4. Cross-device sync: every per-project list needs a per-project merge guard
- **Symptom:** bugs added on iPad didn't appear on Mac (and could be silently wiped).
- **Root cause:** projBugsData had no cross-device guard, and the local copy never passed { serverState } to applyStateToGlobals — so a newer-but-emptier device state could clobber server data.
- **Fix:** per-project merge in applyStateToGlobals: for each project, keep server's list when this device has none; also pass { serverState: serverState } from processLoadedData.
- **Lesson:** any new user-data collection (bug list, inbox, wall) must follow the word-wall/inbox guard pattern or it will fight across devices. Also: guards only work if the caller actually passes serverState.

### 5. Browser compat: optional chaining ?. is a parse error on Chrome < 80
- **Symptom:** dashboard dead on old Huawei browsers / Android WebViews (EMUI 8–10) and older Samsung Internet.
- **Root cause:** ES2020 syntax (?., ??) is a **parse error** (not a missing feature) in Chromium < 80 — the entire inline script fails to load.
- **Fix:** transpile the inline <script> to ES2019 with **esbuild** (compat-build.mjs). Also fix ?. inside inline onclick/onchange attribute strings (esbuild can't see them) and CSS inset:0 → explicit top/right/bottom/left (Chrome < 87).
- **Workflow:** readable source = dev-tools/dashboard.html; deployed build = nakfaai/dashboards/command-center/index.html. Edit source → run node compat-build.mjs <live file> → push. See dashboards/COMPAT.md.
- **Lesson:** before declaring a fix "done", test on the target device/browser. ?. and ?? are the #1 silent killers for old Android WebViews; always check grep -c on anything mobile-facing.

## General

### 6. "Did you push it?" — always verify, don't assume
- After every push, confirm git rev-list --left-right --count shows 0 0, and curl the live URL to check the marker actually deployed (cache-bust with ?v=$(date +%s%N)).
- Poll the live HTML for a **specific new marker**, not a generic one ("Copy All" already existed elsewhere and gave a false positive).

### 7. Test data pollution
- Playwright/browser tests write to dashboard-data.json (via the 1919 dev server) and localStorage. Always git checkout -- dashboard-data.json and kill servers (kill $(lsof -ti:4600)) after testing.

### 8. Deploy gate: test before push — `npm run deploy`
- **Rule:** no dashboard deploy without a green `npm run test:e2e` (Playwright, Chromium + WebKit). The `predeploy` hook runs it automatically and **aborts the deploy on any failure** — never bypass with a bare `git push`.
- **Workflow:** edit `dashboard.html` → port the fix into `~/Developer/projects/nakfaai/dashboards/command-center/index.html` (it has passkey auth + API endpoints the local copy lacks — **never wholesale replace**) → `npm run deploy -- "msg"` (tests → compat-build ES2019 → commit+push → verify) → curl `https://nakfaai.com/dashboard/` for a **specific new marker** (Lesson 6).
- Validate without deploying: `npm run deploy:dry -- "msg"`.
- The suite's notes test writes `dashboard-data.json` — restore after: `git checkout -- dashboard-data.json`.
