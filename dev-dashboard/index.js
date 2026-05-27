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
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Configuration ───────────────────────────────────────────────────────────

const INVENTORY_PATH = "/Users/ammaniel/myapps/inventory.md";
const APPS_ROOT = "/Users/ammaniel/myapps";
const PORT = 1919;
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

    .actions { width: 180px; }

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
      </tbody>
    </table>

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

function handle404(res) {
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    return handlePage(res);
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return handleStatus(res);
  }

  if (req.method === "POST" && url.pathname === "/api/stop") {
    return handleStop(req, res);
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
  console.log(`  Press Ctrl+C to stop`);
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down dashboard…");
  server.close(() => process.exit(0));
});
