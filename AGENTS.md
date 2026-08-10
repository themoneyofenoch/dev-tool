# Dev Tools — AGENTS.md

## 🔴 UNBREAKABLE RULES

**🚫 NEVER touch nakfaai.com** — `nakfaai.com` domain (files, database, folders) is exclusively for the nakfaai project. Never deploy to it, modify its files, or touch its database for any subdomain or other purpose.

## Deployment

- **LIVE dashboard** (`nakfaai.com/dashboard/`) is served from repo `themoneyofenoch/nakfaai`, file `dashboards/command-center/index.html` (Node.js Passenger app; **PHP does NOT run there**). The live API is `GET/POST /api/dashboard/data` (JSONP `?callback=` on GET, passkey session cookie, `credentials:'include'`).
- **Deploy = git push to `themoneyofenoch/nakfaai` main** → hPanel auto-deploys `/`, `/dashboard/`, `/hintza/` together (once the hPanel Node.js app is connected to GitHub; verify webhook via `gh api repos/themoneyofenoch/nakfaai/hooks`).
- **🚫 NEVER use `hostinger_deploy_site` or any Hostinger deploy tool for dashboard.deploy** — wrong directories / wipes. **Never SSH-edit live nakfaai.com files** — the sanctioned channel is the GitHub repo.
- The nakfaai `command-center/index.html` copy has **passkey auth + `/api/dashboard/data` endpoints the local copy lacks — port fixes to it, NEVER replace it wholesale** with `dashboard.html`.
- Legacy PHP path is DEAD (no DNS on `dashboard.nakfaai.com`) — do not deploy there.
- **Local mode saves to `dashboard-data.json`** via `dev-dashboard/index.js` (`POST /api/save` on port 1919) — probed at load (`localApiUrl`); never localStorage-only. `POST /api/progress/save` is a real bridge used by `toggleAmTodo` — don't remove.

## Data Persistence

- **Local**: saves → `dashboard-data.json` via the 1919 dev server (`/api/save`). **Live**: saves → Node API `POST /api/dashboard/data` (MySQL/DB is handled by the nakfaai server's `db.ts`).
- The old MySQL `dashboard-api.php` path is retired for the live site (nakfaai.com is a Node Passenger app, no PHP).
- `env.dashboard` is only needed if the legacy PHP copy is ever revived — not required anywhere today.

## Testing the Dashboard

**NEVER declare dashboard fixes "done" without actual browser testing.** Use Playwright MCP to test in a real browser. Every fix must be verified end-to-end.

### Quick Test Flow

```bash
# 1. Start local server
nohup python3 -m http.server 4600 --directory /Users/nakfaai/Developer/dev-tools > /dev/null 2>&1 &
sleep 2 && curl -s -o /dev/null -w "%{http_code}" http://localhost:4600/dashboard.html  # expect 200

# 2. Use Playwright MCP to test in browser:
```

```
skill(mcp_name="playwright", tool_name="browser_navigate", arguments={"url":"http://localhost:4600/dashboard.html"})
```

### Critical Test Scenarios

**1. Save persistence (tab crash test)**
```
# Set data, force-save, then simulate tab crash:
skill_mcp evaluate: () => {
  document.getElementById('scratchpadArea').value = 'TEST' + Date.now();
  await saveStateNow();
  // Clear individual keys (simulate corrupted localStorage)
  ['ammaniel-todo-v2','ammaniel-ideas-columns','ammaniel-scratchpad'].forEach(k => localStorage.removeItem(k));
}
# Reload page and verify data survived:
skill_mcp browser_navigate url="http://localhost:4600/dashboard.html"
skill_mcp evaluate: () => {
  return {
    scratchpad: document.getElementById('scratchpadArea')?.value,
    todoRestored: !!localStorage.getItem('ammaniel-todo-v2')
  };
}
# Expect: scratchpad has "TEST..." text, todoRestored = true
```

**2. Console errors**
```
skill_mcp browser_console_messages level="error"
# Expect: 0 errors (only favicon.ico 404 is acceptable)
```

**3. Data in correct localStorage keys**
```
# After save, BOTH individual keys AND consolidated cache must have data:
skill_mcp evaluate: () => {
  const cache = JSON.parse(localStorage.getItem('ammaniel-dashboard-local')||'{}');
  return {
    individualExists: !!localStorage.getItem('ammaniel-todo-v2'),
    cacheHasState: !!cache._state,
    cacheHasTodoCols: !!cache._state?.todoCols,
    cacheHasScratchpad: !!cache._state?.scratchpadText,
  };
}
# Expect: ALL true
```

**4. Card drag (SortableJS)**
```
# Navigate to IDEAS tab, verify Sortable instances exist:
skill_mcp evaluate: () => {
  return {
    sortableCount: window._ideaSortables?.length,
    boardExists: !!document.getElementById('ideasBoard'),
  };
}
# Expect: sortableCount > 2 (column sort + card sorts)
```

**5. No duplicate saves**
```
# Check that saveStateNow is a single function, not two:
grep -c "async function saveStateNow" dashboard.html  # expect 1
grep "\bsaveState()\b" dashboard.html                   # expect 0 (old function removed)
```

### Save Architecture (After Fixes)

```
All mutations → saveTodos/saveIdeas/saveScratchpad/etc
                    ↓
               setLS(key, val)
                    ↓
          ┌────────┴────────┐
     localStorage.setItem    debounceSaveState()
     (individual key)             ↓
          +                   setTimeout 400ms
     LOCAL_SAVE_KEY                ↓
     (consolidated cache)    saveStateNow()
     [IMMEDIATE]                  ↓
                          ┌──────┴──────┐
                     LOCAL_SAVE_KEY    POST to server API
                     [IMMEDIATE]       [debounced]
```

Key rule: **localStorage writes must be synchronous/immediate**. Server POST can be debounced. This way, no data is ever lost on tab close.

### Common Pitfalls

- `dashboard-data.json` has stale `_state` from a production save → `loadData()` must prefer **local cache** over server state
- `saveUrl()` returns `/api/save` for local mode → must return `null` so the save falls back to localStorage
- Card Sortable targets `.idea-cards` → cards are NOT direct children (they're in `.idea-group` divs). Use `.idea-group-cards` containers instead.
- `saveStateNow()` reads `scratchpadArea.value` — textarea exists in DOM even when IDEAS tab is hidden
- Never call `migrateFromLocalStorage()` in a catch block — it destroys the local cache

### Stop Server After Testing
```bash
kill $(lsof -ti:4600) 2>/dev/null
```
