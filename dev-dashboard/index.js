#!/usr/bin/env node

/**
 * Dev Dashboard — Web UI for all 15 Ammaniel apps.
 *
 * Starts an HTTP server on port 1919.
 * No dependencies — pure Node.js.
 *
 * Usage: node dev-dashboard/index.js
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

// ─── Dictation ─────────────────────────────────────────────────────
const DICTATE_PORT = 1920;
const DICTATE_PY = "/Users/nakfaai/scripts/dictation-server.py";
const DICTATE_ENV = "/Users/nakfaai/scripts/dictate-env/bin/python3";
let dictateProcess = null;

// ─── Configuration ───────────────────────────────────────────────────────────

const INVENTORY_PATH = "/Users/nakfaai/Developer/projects/inventory.md";
const APPS_ROOT = "/Users/nakfaai/Developer/projects";
const PORT = 1919;
const DB_PATH = "/Users/nakfaai/Developer/dev-tools/dashboard-data.json";
const RESERVED_PORT = 8888;

// ─── Inventory parser ────────────────────────────────────────────────────────

function parseInventory(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const projects = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed === "|") continue;
    if (/^\|[\s\-:]+\|/.test(trimmed)) continue;

    if (trimmed.includes("---") || /^\|\s*#\s*\|/.test(trimmed)) {
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");

    if (cells.length < 5) continue;

    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue;

    const name = cells[1];
    const relativePath = cells[2];
    const port = parseInt(cells[3], 10);

    if (isNaN(port)) continue;

    if (port === RESERVED_PORT) continue;

    const fullPath = path.join(APPS_ROOT, relativePath);

    projects.push({ num, name, relativePath, fullPath, port });
  }

  return projects;
}

// ─── Port check ──────────────────────────────────────────────────────────────

function isPortRunning(port) {
  try {
    const result = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 2000,
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    const result = execSync(`lsof -ti :${port} 2>/dev/null || true`, {
      encoding: "utf-8",
      timeout: 2000,
    });
    const pids = result.trim();
    if (!pids) return { killed: 0, msg: `Nothing running on port ${port}` };
    execSync(`kill ${pids} 2>/dev/null || true`, { timeout: 2000 });
    return { killed: pids.split("\n").length, msg: `Killed PID(s) ${pids} on port ${port}` };
  } catch (err) {
    return { killed: 0, msg: `Error killing port ${port}: ${err.message}` };
  }
}

// ─── Load projects ───────────────────────────────────────────────────────────

let projects = [];
try {
  projects = parseInventory(INVENTORY_PATH);
} catch (err) {
  console.error(`Cannot read inventory: ${err.message}`);
  process.exit(1);
}

if (projects.length === 0) {
  console.error("No projects found in inventory.");
  process.exit(1);
}

// ─── HTML page ───────────────────────────────────────────────────────────────

function renderPage() {
  const rows = projects
    .map(
      (p, i) => `
      <tr data-port="${p.port}">
        <td class="num">${i + 1}</td>
        <td class="name"><span class="dot" id="dot-${p.port}"></span>${p.name}</td>
        <td class="port">${p.port}</td>
        <td class="actions">
          <button class="open-btn" onclick="openApp(${p.port})">Open</button>
          <button class="find-btn" onclick="openFinder('${p.fullPath.replace(/'/g, "\\'")}')" title="Open in Finder">📁</button>
          <button class="oc-btn" onclick="openCodeCmd('${p.name}', '${p.fullPath.replace(/'/g, "\\'")}')" title="Copy OpenCode command">🤖</button>
          <button class="stop-btn" onclick="stopApp(${p.port})">Stop</button>
        </td>
      </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dev Dashboard — Ammaniel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      min-height: 100vh;
      font-size: 18px;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
      padding: 32px 20px;
    }

    /* ── Header ────────────────────────────────────────────── */

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #21262d;
    }

    .header h1 { font-size: 20px; font-weight: 600; color: #f0f6fc; }

    .header .meta {
      font-size: 12px;
      color: #8b949e;
    }

    .refresh-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #8b949e;
    }

    .refresh-badge .pulse {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #3fb950;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* ── Summary bar ────────────────────────────────────────── */

    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .summary .stat {
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 10px 16px;
      flex: 1;
      text-align: center;
    }

    .stat .value { font-size: 24px; font-weight: 700; color: #f0f6fc; }
    .stat .label { font-size: 11px; color: #8b949e; margin-top: 2px; }

    .stat.running .value { color: #3fb950; }
    .stat.stopped .value { color: #8b949e; }

    /* ── Table ──────────────────────────────────────────────── */

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px 10px;
      border-bottom: 1px solid #21262d;
    }

    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid #161b22;
      font-size: 14px;
      vertical-align: middle;
    }

    tbody tr:hover { background: #161b22; }

    .num { color: #484f58; font-size: 13px; font-variant-numeric: tabular-nums; width: 32px; }

    .name {
      font-weight: 500;
      color: #f0f6fc;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #484f58;
      flex-shrink: 0;
      transition: background 0.3s ease;
    }

    .dot.live { background: #3fb950; box-shadow: 0 0 6px rgba(63, 185, 80, 0.4); }

    .port {
      color: #8b949e;
      font-variant-numeric: tabular-nums;
      font-size: 13px;
      width: 60px;
    }

    /* ── Buttons ────────────────────────────────────────────── */

    .actions { width: 260px; }

    .open-btn, .stop-btn {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .open-btn {
      background: transparent;
      color: #58a6ff;
      border-color: #1f6feb33;
      margin-right: 6px;
    }

    .open-btn:hover {
      background: #1f6feb1a;
      border-color: #1f6feb;
    }

    .stop-btn {
      background: transparent;
      color: #f85149;
      border-color: #f8514933;
    }

    .stop-btn:hover {
      background: #f851491a;
      border-color: #f85149;
    }

    .stop-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .find-btn, .oc-btn {
      font-size: 11px;
      font-weight: 500;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      margin-right: 3px;
    }
    .find-btn {
      background: transparent;
      color: #8b949e;
      border-color: #30363d;
    }
    .find-btn:hover {
      background: #30363d1a;
      border-color: #8b949e;
    }
    .oc-btn {
      background: transparent;
      color: #d2a8ff;
      border-color: #a371f733;
    }
    .oc-btn:hover {
      background: #a371f71a;
      border-color: #a371f7;
    }
    .stop-all-btn {
      background: transparent;
      color: #f85149;
      border: 1px solid #f8514933;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      white-space: nowrap;
    }
    .stop-all-btn:hover {
      background: #f851491a;
      border-color: #f85149;
    }

    /* ── Toast ───────────────────────────────────────────────── */

    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      opacity: 0;
      transform: translateY(8px);
      transition: all 0.2s ease;
      pointer-events: none;
      z-index: 100;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Footer ──────────────────────────────────────────────── */

    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: #484f58;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Dev Dashboard</h1>
      <div>
        <span class="refresh-badge"><span class="pulse"></span> Live</span>
        <button class="stop-all-btn" onclick="stopAllServers()" title="Kill all dev servers">🛑 Stop All</button>
      </div>
    </div>

    <div class="summary">
      <div class="stat running"><div class="value" id="count-running">—</div><div class="label">Running</div></div>
      <div class="stat stopped"><div class="value" id="count-stopped">—</div><div class="label">Stopped</div></div>
      <div class="stat"><div class="value">${projects.length}</div><div class="label">Total</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>App</th>
          <th>Port</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <!-- Dictation row -->
        <tr data-port="${DICTATE_PORT}" id="dictate-row">
          <td class="num" style="color:#484f58">—</td>
          <td class="name"><span class="dot" id="dot-${DICTATE_PORT}"></span>🎤 Dictation</td>
          <td class="port">${DICTATE_PORT}</td>
          <td class="actions">
            <button class="open-btn" id="dictateToggleBtn" onclick="toggleDictate()">Start</button>
            <span id="dictateStatus" style="font-size:11px;color:#8b949e;margin-left:6px"></span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Dictation transcript output -->
    <div id="dictateTranscript" style="display:none;margin-top:16px;background:#161b22;border:1px solid #21262d;border-radius:6px;padding:14px 18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:#f0f6fc">🎤 Dictation Live</span>
        <span style="font-size:10px;color:#8b949e" id="dictateTransStatus">listening...</span>
      </div>
      <div id="dictateTransText" style="font-size:13px;color:#c9d1d9;line-height:1.6;min-height:28px;font-style:italic">Speak — text appears here and types into your active field.</div>
    </div>

    <div class="footer">
      port 1919 · dev-dashboard · ${new Date().toLocaleDateString()}
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    let toastTimeout;

    function showToast(msg) {
      const el = document.getElementById("toast");
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => el.classList.remove("show"), 2000);
    }

    function openApp(port) {
      window.open("http://localhost:" + port, "_blank");
    }

    async function stopApp(port) {
      if (!confirm("Kill process on port " + port + "?")) return;
      try {
        const res = await fetch("/api/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ port }),
        });
        const data = await res.json();
        showToast(data.msg);
        fetchStatus(); // refresh immediately
      } catch (err) {
        showToast("Failed to stop: " + err.message);
      }
    }

    function nameToKey(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    async function openFinder(path) {
      try {
        const res = await fetch("/api/open-finder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
        const data = await res.json();
        if (data.ok) showToast("📁 Opened in Finder");
        else showToast("❌ " + (data.msg || "Failed"));
      } catch (err) {
        showToast("❌ " + err.message);
      }
    }

    function openCodeCmd(name, path) {
      const key = nameToKey(name);
      const cmd = "work on " + key + " \u2014 " + path;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd).then(() => {
          showToast("🤖 Copied: " + cmd);
        }).catch(() => {
          fallbackCopy(cmd);
          showToast("🤖 Copied: " + cmd);
        });
      } else {
        fallbackCopy(cmd);
        showToast("🤖 Copied: " + cmd);
      }
    }

    function fallbackCopy(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    async function stopAllServers() {
      if (!confirm("Kill ALL dev servers?")) return;
      const ports = [];
      document.querySelectorAll("tr[data-port]").forEach(tr => {
        const port = parseInt(tr.dataset.port, 10);
        if (!isNaN(port)) ports.push(port);
      });
      try {
        const res = await fetch("/api/dev-batch-kill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ports }),
        });
        const data = await res.json();
        showToast("🛑 Killed " + data.killed + " server" + (data.killed === 1 ? "" : "s"));
        fetchStatus();
      } catch (err) {
        showToast("❌ " + err.message);
      }
    }

    async function fetchStatus() {
      try {
        const res = await fetch("/api/status");
        const apps = await res.json();

        let runningCount = 0;
        let stoppedCount = 0;

        for (const app of apps) {
          const dot = document.getElementById("dot-" + app.port);
          if (dot) {
            dot.classList.toggle("live", app.running);
          }
          const stopBtn = document.querySelector('tr[data-port="' + app.port + '"] .stop-btn');
          if (stopBtn) {
            stopBtn.disabled = !app.running;
          }
          if (app.running) runningCount++;
          else stoppedCount++;
        }

        document.getElementById("count-running").textContent = runningCount;
        document.getElementById("count-stopped").textContent = stoppedCount;
      } catch (err) {
        // Silently retry on next interval
      }
    }

    // ─── Dictation ────────────────────────────────────────────────────
    let dictateWs = null;
    let dictateActive = false;

    function toggleDictate() {
      if (dictateActive) { stopDictate(); }
      else { startDictate(); }
    }

    function startDictate() {
      const btn = document.getElementById('dictateToggleBtn');
      const status = document.getElementById('dictateStatus');
      btn.disabled = true;
      btn.textContent = 'Starting...';

      fetch('/api/dictate/start', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            dictateActive = true;
            btn.textContent = 'Stop';
            status.textContent = '🎤 ON';
            status.style.color = '#3fb950';
            document.getElementById('dictateTranscript').style.display = '';
            connectDictateWS();
          } else {
            btn.textContent = 'Start';
            status.textContent = 'Failed: ' + (data.msg || 'unknown');
            status.style.color = '#f85149';
          }
          btn.disabled = false;
        })
        .catch(err => {
          btn.textContent = 'Start';
          status.textContent = 'Error: ' + err.message;
          status.style.color = '#f85149';
          btn.disabled = false;
        });
    }

    function stopDictate() {
      if (dictateWs) { try { dictateWs.close(); } catch(e) {} dictateWs = null; }
      fetch('/api/dictate/stop', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          dictateActive = false;
          const btn = document.getElementById('dictateToggleBtn');
          btn.textContent = 'Start';
          document.getElementById('dictateStatus').textContent = '';
          document.getElementById('dictateTranscript').style.display = 'none';
          if (data.ok) showToast('🔇 Dictation stopped');
        });
    }

    function connectDictateWS() {
      if (dictateWs) return;
      dictateWs = new WebSocket('ws://127.0.0.1:' + ${DICTATE_PORT});
      dictateWs.onopen = () => {
        document.getElementById('dictateTransStatus').textContent = 'listening...';
      };
      dictateWs.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.text) {
            const el = document.getElementById('dictateTransText');
            el.textContent = data.text;
            el.style.fontStyle = 'normal';
            document.getElementById('dictateTransStatus').textContent = 'heard: ' + data.text.split(' ').length + ' words';
            // Also type into active field if on dashboard.html
            setTimeout(() => { el.style.fontStyle = 'italic'; el.textContent = 'Speak — text appears here...'; }, 3000);
          }
        } catch(err) {}
      };
      dictateWs.onclose = () => { dictateWs = null; };
      dictateWs.onerror = () => { dictateWs = null; };
    }

    // Initial fetch + poll every 3 seconds
    fetchStatus();
    setInterval(fetchStatus, 3000);
  </script>
</body>
</html>`;
}

// ─── API handlers ────────────────────────────────────────────────────────────

function handleStatus(res) {
  const status = projects.map((p) => ({
    name: p.name,
    port: p.port,
    running: isPortRunning(p.port),
  }));
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(status));
}

function handleRestart(res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, msg: "Restarting..." }));
  // Spawn new process and exit current
  setTimeout(() => {
    const { spawn } = require("child_process");
    const child = spawn(process.argv[0], process.argv.slice(1), {
      detached: true,
      stdio: "ignore",
      cwd: process.cwd(),
    });
    child.unref();
    process.exit(0);
  }, 200);
}

function handleOpenStart(res) {
  const { exec } = require("child_process");
  exec("open /Users/nakfaai/Developer/dev-tools/start-dashboard.command");
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, msg: "Opened start-dashboard.command in Finder" }));
}

function handleStop(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let port;
    try {
      const parsed = JSON.parse(body);
      port = parseInt(parsed.port, 10);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ killed: 0, msg: "Invalid JSON body" }));
      return;
    }

    if (isNaN(port) || port < 1 || port > 65535) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ killed: 0, msg: `Invalid port: ${port}` }));
      return;
    }

    if (port === PORT) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ killed: 0, msg: "Cannot stop the dashboard itself" }));
      return;
    }

    const result = killPort(port);
    res.writeHead(result.killed > 0 ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  });
}

function handlePage(res) {
  const html = renderPage();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStatic(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.writeHead(200, { "Content-Type": contentType + "; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "File not found" }));
  }
}

// ─── Scan new projects ────────────────────────────────────────────────

function isKnownProjectDir(dirPath, knownPaths) {
  if (knownPaths.has(dirPath)) return true;
  for (const kp of knownPaths) {
    if (kp.startsWith(dirPath + "/") || kp.startsWith(dirPath + path.sep)) return true;
  }
  return false;
}

function analyzeProjectDir(name, dirPath) {
  // Normalize: trim trailing whitespace (macOS allows trailing spaces in dir names)
  name = name.trimEnd();
  dirPath = dirPath.trimEnd();
  const pkgPath = path.join(dirPath, "package.json");
  let hasPackageJson = false;
  let detectedFramework = null;
  let portFromScripts = null;

  try {
    if (fs.existsSync(pkgPath)) {
      hasPackageJson = true;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (allDeps.vite) detectedFramework = "Vit";
      else if (allDeps.next) detectedFramework = "Nxt";
      else if (allDeps["react-scripts"]) detectedFramework = "CRA";
      else if (allDeps.express) detectedFramework = "Exp";

      const devScript = pkg.scripts && pkg.scripts.dev;
      if (devScript) {
        const portMatch = devScript.match(/(?:--port|-p)\s*(\d+)/);
        if (portMatch) {
          portFromScripts = parseInt(portMatch[1], 10);
        }
      }
    }
  } catch (_) {
    // parse error — skip
  }

  return { name, path: dirPath, hasPackageJson, detectedFramework, portFromScripts };
}

// Directories that are clearly not projects — skip from scan results
const NON_PROJECT_DIRS = new Set([
  "app", "backup", "backups", "db", "docs", "emails", "htmls", "lib",
  "mcp", "old", "public", "scripts", "temp", "test", "components",
  "drizzle", "node_modules", "dev-tools", "auth", "projects", "backup",
  "backups", "spec-learning", "selamhintza", "cloudnakfaai", "fideltype",
  "wefam 2 try", "wiseappsai", "untitled folder", "habeshA WEDDING",
  "app publisher", "tebaateay 1", "tebaateay1", "abc geez",
  "multi-tenant-cms", "test-cap-init", "no", "morgon",
  "SILVER LEAVES copy", "kalkidan copy", "eritreanfestival deep",
  "ai-cms", "immigration", "semoui", "semouideli", "eritrean-festival-app",
  "bookthem", "old", "app publisher"
]);

function handleScanNewProjects(res) {
  try {
    // Normalize to lowercase for macOS case-insensitive comparison
    const knownPaths = new Set(projects.map((p) => p.fullPath.toLowerCase()));
    const discovered = [];

    function isNonProject(name) {
      const n = name.toLowerCase().trim();
      if (n.startsWith(".")) return true;
      if (NON_PROJECT_DIRS.has(n)) return true;
      // Skip single-word lowercase dirs that are clearly not projects
      if (/^(app|backup|backups|db|docs?|emails?|htmls?|lib|mcp|old|public|scripts?|temp|test|components?|drizzle|auth|projects?)$/i.test(n)) return true;
      return false;
    }

    // Scan main apps directory (skip "others" — handled separately)
    try {
      const mainDirs = fs.readdirSync(APPS_ROOT, { withFileTypes: true });
      for (const entry of mainDirs) {
        if (!entry.isDirectory()) continue;
        if (isNonProject(entry.name)) continue;
        if (entry.name === "others") continue;
        const dirPath = path.join(APPS_ROOT, entry.name);
        if (isKnownProjectDir(dirPath.toLowerCase(), knownPaths)) continue;
        discovered.push(analyzeProjectDir(entry.name, dirPath));
      }
    } catch (_) {
      /* ignore fs errors */
    }

    // Scan others/ directory
    const othersRoot = path.join(APPS_ROOT, "others");
    try {
      if (fs.existsSync(othersRoot)) {
        const otherDirs = fs.readdirSync(othersRoot, { withFileTypes: true });
        for (const entry of otherDirs) {
          if (!entry.isDirectory()) continue;
          if (isNonProject(entry.name)) continue;
          const dirPath = path.join(othersRoot, entry.name);
          if (isKnownProjectDir(dirPath.toLowerCase(), knownPaths)) continue;
          discovered.push(analyzeProjectDir(entry.name, dirPath));
        }
      }
    } catch (_) {
      /* ignore fs errors */
    }

    // Only return directories with package.json (real projects)
    // Dirs without package.json are not projects — skip them
    sendJSON(res, 200, { projects: discovered.filter(p => p.hasPackageJson) });
  } catch (err) {
    sendJSON(res, 500, { error: err.message, projects: [] });
  }
}

function handle404(res) {
  const cors = corsHeaders();
  res.writeHead(404, { ...cors, "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

// ─── Progress auto-save ────────────────────────────────────────────

function handleProgress(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, msg: "Invalid JSON" }));
      return;
    }
    const { projectKey, doneItems } = data;
    if (!projectKey || !doneItems) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, msg: "Missing projectKey or doneItems" }));
      return;
    }
    try {
      const jsonPath = DB_PATH;
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const db = JSON.parse(raw);
      const proj = db.projects && db.projects[projectKey];
      if (!proj) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, msg: "Project not found" }));
        return;
      }
      for (const [key, done] of Object.entries(doneItems)) {
        const match = key.match(/^(.+)-(\d+)$/);
        if (!match || match[1] !== projectKey) continue;
        const idx = parseInt(match[2], 10);
        if (proj.ammanielTodos && proj.ammanielTodos[idx]) {
          proj.ammanielTodos[idx].done = done;
        }
      }
      db.lastUpdated = new Date().toISOString();
      fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2) + "\n", "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, msg: "Progress saved" }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, msg: err.message }));
    }
  });
}

// ─── CORS helper ───────────────────────────────────────────────────

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ─── Webindexer bridge ─────────────────────────────────────────────

const WEBINDEXER = "/Users/nakfaai/Developer/dev-tools/webindexer/index.mjs";

function sendJSON(res, code, data) {
  const cors = corsHeaders();
  res.writeHead(code, { ...cors, "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function handleWebindexerInspect(req, res) {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let data;
    try { data = JSON.parse(body); } catch { sendJSON(res, 400, { ok: false, msg: "Invalid JSON" }); return; }
    const url = data?.url;
    if (!url) { sendJSON(res, 400, { ok: false, msg: "Missing url" }); return; }

    const child = spawn("node", [WEBINDEXER, "inspect", url], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60000,
    });

    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      if (code !== 0) {
        sendJSON(res, 500, { ok: false, msg: stderr.slice(0, 500) || "Webindexer failed" });
        return;
      }
      try {
        const result = JSON.parse(stdout);
        sendJSON(res, 200, { ok: true, result });
      } catch {
        sendJSON(res, 500, { ok: false, msg: "Failed to parse webindexer output" });
      }
    });
  });
}

function handleWebindexerCrawl(req, res) {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let data;
    try { data = JSON.parse(body); } catch { sendJSON(res, 400, { ok: false, msg: "Invalid JSON" }); return; }
    const url = data?.url;
    if (!url) { sendJSON(res, 400, { ok: false, msg: "Missing url" }); return; }
    const maxPages = data?.maxPages || 15;
    const maxDepth = data?.maxDepth || 2;

    const args = [WEBINDEXER, "crawl", url, "--max-pages", String(maxPages), "--max-depth", String(maxDepth)];

    const child = spawn("node", args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
    });

    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      if (code !== 0) {
        sendJSON(res, 500, { ok: false, msg: stderr.slice(0, 500) || "Webindexer crawl failed" });
        return;
      }
      try {
        const result = JSON.parse(stdout);
        sendJSON(res, 200, { ok: true, result });
      } catch {
        sendJSON(res, 500, { ok: false, msg: "Failed to parse webindexer output" });
      }
    });
  });
}

// ─── Open Finder ─────────────────────────────────────────────────────────

function handleOpenFinder(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let path;
    try {
      const parsed = JSON.parse(body);
      path = parsed.path;
    } catch {
      sendJSON(res, 400, { ok: false, msg: "Invalid JSON body" });
      return;
    }
    if (!path || typeof path !== "string") {
      sendJSON(res, 400, { ok: false, msg: "Missing or invalid 'path' string" });
      return;
    }
    try {
      execSync(`open "${path}"`, { timeout: 5000 });
      sendJSON(res, 200, { ok: true });
    } catch (err) {
      sendJSON(res, 500, { ok: false, msg: err.message });
    }
  });
}

// ─── Dev Git Status ────────────────────────────────────────────────────

function handleDevGitStatus(req, res) {
  try {
    const raw = req.url.includes("?") ? req.url.split("?")[1] : "";
    const params = new URLSearchParams(raw);
    const projectsParam = params.get("projects");
    if (!projectsParam) {
      sendJSON(res, 400, { ok: false, msg: "Missing 'projects' query param" });
      return;
    }
    let projectsList;
    try {
      projectsList = JSON.parse(decodeURIComponent(projectsParam));
    } catch {
      sendJSON(res, 400, { ok: false, msg: "Invalid JSON in 'projects' param" });
      return;
    }
    if (!Array.isArray(projectsList)) {
      sendJSON(res, 400, { ok: false, msg: "'projects' must be an array" });
      return;
    }

    const results = projectsList.map((entry) => {
      const key = entry.key || "unknown";
      const projectPath = entry.path;
      if (!projectPath) return { key, branch: null, dirty: false, error: "No path" };
      try {
        const branch = execSync("git rev-parse --abbrev-ref HEAD", {
          cwd: projectPath,
          encoding: "utf-8",
          timeout: 5000,
        }).trim();
        const porcelain = execSync("git status --porcelain", {
          cwd: projectPath,
          encoding: "utf-8",
          timeout: 5000,
        });
        const dirty = porcelain.trim().length > 0;
        return { key, branch, dirty };
      } catch (err) {
        return { key, branch: null, dirty: false, error: err.message };
      }
    });

    sendJSON(res, 200, { results });
  } catch (err) {
    sendJSON(res, 500, { ok: false, msg: err.message, results: [] });
  }
}

// ─── Dictation Start/Stop ──────────────────────────────────────────

function handleDictateStart(req, res) {
  // Already running? Just confirm
  if (isPortRunning(DICTATE_PORT)) {
    sendJSON(res, 200, { ok: true, msg: "Already running" });
    return;
  }
  // Also check our tracked process
  if (dictateProcess && !dictateProcess.killed) {
    sendJSON(res, 200, { ok: true, msg: "Already running" });
    return;
  }
  try {
    const child = spawn(DICTATE_ENV, [DICTATE_PY], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    child.stdout.on("data", () => {}); // drain
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => {
      console.log(`  🎤 Dictation server exited (code ${code})`);
      dictateProcess = null;
    });
    dictateProcess = child;
    // Give it a moment to start listening
    setTimeout(() => {
      if (isPortRunning(DICTATE_PORT)) {
        sendJSON(res, 200, { ok: true, msg: "Dictation started" });
      } else {
        sendJSON(res, 200, { ok: true, msg: "Starting..." });
      }
    }, 1500);
  } catch (err) {
    sendJSON(res, 500, { ok: false, msg: err.message });
  }
  // Don't send response yet — wait for the timeout above
  return; // handled by setTimeout
}

function handleDictateStop(req, res) {
  if (dictateProcess && !dictateProcess.killed) {
    dictateProcess.kill("SIGTERM");
    dictateProcess = null;
  }
  // Also kill any orphan Python dictation processes
  try { execSync("pkill -f dictation-server.py 2>/dev/null || true"); } catch(e) {}
  sendJSON(res, 200, { ok: true, msg: "Dictation stopped" });
}

function handleDictateStatus(req, res) {
  const running = isPortRunning(DICTATE_PORT);
  sendJSON(res, 200, { running, msg: running ? "Running" : "Stopped" });
}

// ─── Save Dashboard Data ───────────────────────────────────────────────

function handleSaveDashboardData(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      sendJSON(res, 400, { ok: false, msg: "Invalid JSON" });
      return;
    }
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
      sendJSON(res, 200, { ok: true, msg: "Saved" });
    } catch (err) {
      sendJSON(res, 500, { ok: false, msg: err.message });
    }
  });
}

// ─── Dev Batch Kill ────────────────────────────────────────────────────

function handleDevBatchKill(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let ports;
    try {
      const parsed = JSON.parse(body);
      ports = parsed.ports;
    } catch {
      sendJSON(res, 400, { ok: false, msg: "Invalid JSON body" });
      return;
    }
    if (!Array.isArray(ports)) {
      sendJSON(res, 400, { ok: false, msg: "'ports' must be an array" });
      return;
    }
    let killed = 0;
    for (const port of ports) {
      const result = killPort(parseInt(port, 10));
      if (!isNaN(parseInt(port, 10))) killed += result.killed;
    }
    sendJSON(res, 200, { killed });
  });
}

// ─── AI Social Media Generator ─────────────────────────────────────

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || "";

function handleAISocial(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let data;
    try { data = JSON.parse(body); } catch { return sendJSON(res, 400, { ok: false, msg: "Invalid JSON" }); }
    const { prompt, context } = data;
    if (!prompt) return sendJSON(res, 400, { ok: false, msg: "Missing prompt" });

    const systemMsg = "You are a social media marketing expert. Write engaging, platform-appropriate social media posts. Return plain text with each post separated by '---'. Each post starts with a platform label like '[Twitter]', '[Instagram]', or '[LinkedIn]'.";

    let userMsg = prompt + "\n\n";
    if (context) {
      if (context.aboutUs) userMsg += "About: " + context.aboutUs + "\n";
      if (context.description) userMsg += "Description: " + context.description + "\n";
      if ((context.keywords||[]).length) userMsg += "Keywords: " + context.keywords.join(", ") + "\n";
      if ((context.hashtags||[]).length) userMsg += "Hashtags: " + context.hashtags.join(", ") + "\n";
      if (context.target) userMsg += "Target audience: " + context.target + "\n";
    }

    const payload = JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const reqOpts = {
      hostname: "api.deepseek.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + DEEPSEEK_KEY,
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const apiReq = https.request(reqOpts, (apiRes) => {
      let apiBody = "";
      apiRes.on("data", (c) => apiBody += c);
      apiRes.on("end", () => {
        try {
          const json = JSON.parse(apiBody);
          const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          if (text) return sendJSON(res, 200, { ok: true, text: text.trim() });
        } catch (e) {}
        sendJSON(res, 500, { ok: false, msg: "AI returned bad response", raw: apiBody.slice(0,500) });
      });
    });
    apiReq.on("error", (e) => sendJSON(res, 500, { ok: false, msg: e.message }));
    apiReq.write(payload);
    apiReq.end();
  });
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cors = corsHeaders();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  function jsonResponse(code, data) {
    res.writeHead(code, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    return handlePage(res);
  }

  // ─── Command Center dashboard ──────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/dashboard.html") {
    return serveStatic(res, "/Users/nakfaai/Developer/dev-tools/dashboard.html", "text/html");
  }

  if (req.method === "GET" && url.pathname === "/dashboard-data.json") {
    return serveStatic(res, "/Users/nakfaai/Developer/dev-tools/dashboard-data.json", "application/json");
  }

  if (req.method === "GET" && url.pathname === "/startpage.html") {
    return serveStatic(res, "/Users/nakfaai/startpage.html", "text/html");
  }

  if (req.method === "GET" && url.pathname === "/startpage-bg.avif") {
    return serveStatic(res, "/Users/nakfaai/startpage-bg.avif", "image/avif");
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return handleStatus(res);
  }

  if (req.method === "GET" && url.pathname === "/api/scan-new-projects") {
    return handleScanNewProjects(res);
  }

  if (req.method === "POST" && url.pathname === "/api/stop") {
    return handleStop(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/progress/save") {
    return handleProgress(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/webindexer/inspect") {
    return handleWebindexerInspect(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/webindexer/crawl") {
    return handleWebindexerCrawl(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/restart") {
    return handleRestart(res);
  }

  if (req.method === "POST" && url.pathname === "/api/open-start") {
    return handleOpenStart(res);
  }

  if (req.method === "POST" && url.pathname === "/api/open-finder") {
    return handleOpenFinder(req, res);
  }

  if (req.method === "GET" && url.pathname === "/api/dev-git-status") {
    return handleDevGitStatus(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/save") {
    return handleSaveDashboardData(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/dev-batch-kill") {
    return handleDevBatchKill(req, res);
  }

  // ─── AI Social Media ──────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/ai/social") {
    return handleAISocial(req, res);
  }

  // ─── Dictation API ────────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/dictate/start") {
    return handleDictateStart(req, res);
  }
  if (req.method === "POST" && url.pathname === "/api/dictate/stop") {
    return handleDictateStop(req, res);
  }
  if (req.method === "GET" && url.pathname === "/api/dictate/status") {
    return handleDictateStatus(req, res);
  }

  return handle404(res);
});

server.listen(PORT, () => {
  const running = projects.map((p) => (isPortRunning(p) ? 1 : 0)).reduce((a, b) => a + b, 0);

  console.log("");
  console.log("  ⚡ Dev Dashboard");
  console.log("  ────────────────────────────────────");
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log(`  Projects: ${projects.length}`);
  console.log(`  Running:  ${running}`);
  console.log(`  Auto-refresh: every 3 seconds`);
  console.log(`  🎤 Dictation: click "Start" on the page`);
  console.log(`  Press Ctrl+C to stop`);
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down dashboard…");
  server.close(() => process.exit(0));
});
