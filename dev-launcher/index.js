#!/usr/bin/env node

/**
 * Dev Launcher CLI
 * Numbered menu to pick a project, start it, and open the browser.
 *
 * Usage: node dev-launcher/index.js
 *
 * Reads /Users/ammaniel/myapps/inventory.md for the project table.
 * Detects running status via `lsof -ti :{port}`.
 * Spawns dev server with child_process.spawn and opens browser.
 */

const { spawn } = require("child_process");
const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

// ─── Configuration ───────────────────────────────────────────────────────────

const INVENTORY_PATH = "/Users/ammaniel/myapps/inventory.md";
const APPS_ROOT = "/Users/ammaniel/myapps";
const RESERVED_PORT = 8888;

// ─── Color helpers (ANSI — no dependencies) ──────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";

const GREEN_DOT = `${GREEN}●${RESET}`;
const GRAY_DOT = `${GRAY}○${RESET}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colorize(text, code) {
  return `${code}${text}${RESET}`;
}

function bold(text) {
  return `${BOLD}${text}${RESET}`;
}

// ─── Port detection ──────────────────────────────────────────────────────────

function isPortInUse(port) {
  try {
    const result = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 3000,
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function getRunningPid(port) {
  try {
    return execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim() || null;
  } catch {
    return null;
  }
}

// ─── Inventory parser ────────────────────────────────────────────────────────

/**
 * Parse the markdown table in inventory.md into an array of project objects.
 *
 * Columns: # | App | Path | Port | Config Type | Config Location | Status
 */
function parseInventory(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const projects = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect table rows: start with | and contain at least one more pipe
    if (!trimmed.startsWith("|") || trimmed === "|") continue;

    // Skip separator rows (|---|...|)
    if (/^\|[\s\-:]+\|/.test(trimmed)) continue;

    // Skip header rows
    if (trimmed.includes("---") || /^\|\s*#\s*\|/.test(trimmed)) {
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    // Split by pipe and trim each cell
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");

    // Need at least: #, App, Path, Port, Config Type
    if (cells.length < 5) continue;

    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue; // skip non-data rows

    const name = cells[1];
    const relativePath = cells[2];
    const port = parseInt(cells[3], 10);
    const configType = cells[4].toLowerCase();

    if (isNaN(port)) continue;

    const fullPath = path.join(APPS_ROOT, relativePath);

    projects.push({
      num,
      name,
      relativePath,
      fullPath,
      port,
      configType,
    });
  }

  return projects;
}

// ─── Start command builder ───────────────────────────────────────────────────

/**
 * Determine the start command for a project based on its config type.
 * Vite   → npx vite --port {port}
 * Next.js → npm run dev
 * Expo   → npx expo start --port {port}
 */
function getStartCommand(project) {
  const { port, configType, name } = project;

  // WeThePeople uses Expo (per task context and inventory notes)
  if (name === "WeThePeople") {
    return {
      cmd: "npx",
      args: ["expo", "start", "--port", String(port)],
      label: `npx expo start --port ${port}`,
    };
  }

  if (configType === "vite") {
    return {
      cmd: "npx",
      args: ["vite", "--port", String(port)],
      label: `npx vite --port ${port}`,
    };
  }

  if (configType === "next.js" || configType === "nextjs") {
    return {
      cmd: "npm",
      args: ["run", "dev"],
      label: "npm run dev",
    };
  }

  if (configType === "dashboard") {
    return {
      cmd: "node",
      args: ["index.js"],
      label: "node index.js",
    };
  }

  // Fallback: try npm run dev
  return {
    cmd: "npm",
    args: ["run", "dev"],
    label: "npm run dev",
  };
}

// ─── Project launcher ────────────────────────────────────────────────────────

function launchProject(project) {
  const { fullPath, name, port } = project;

  // Verify project path exists
  if (!fs.existsSync(fullPath)) {
    console.log(
      `${colorize("✖", RED)} Project path not found: ${colorize(fullPath, GRAY)}`
    );
    return false;
  }

  // Check if already running
  if (isPortInUse(port)) {
    const pid = getRunningPid(port);
    console.log(
      `${colorize("⚠", YELLOW)} ${bold(name)} is already running on port ${bold(String(port))} (PID: ${pid || "unknown"})`
    );
    console.log(`  Opening browser: ${colorize(`http://localhost:${port}`, CYAN)}`);
    openBrowser(port);
    return true;
  }

  const { cmd, args, label } = getStartCommand(project);

  console.log(
    `${colorize("▶", GREEN)} Starting ${bold(name)} on port ${bold(String(port))}…`
  );
  console.log(`  ${colorize("$", DIM)} cd ${fullPath} && ${label}`);
  console.log("");

  try {
    const child = spawn(cmd, args, {
      cwd: fullPath,
      detached: true,
      stdio: "inherit",
      shell: true, // needed for npx resolution in some environments
    });

    child.on("error", (err) => {
      console.error(
        `${colorize("✖", RED)} Failed to start ${bold(name)}: ${err.message}`
      );
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.log(
          `${colorize("✖", RED)} ${bold(name)} exited with code ${code}`
        );
      }
    });

    // Unref so the launcher can exit without waiting for the child
    child.unref();

    // Wait a moment for the server to start, then open browser
    setTimeout(() => {
      openBrowser(port);
    }, 2000);

    return true;
  } catch (err) {
    console.error(
      `${colorize("✖", RED)} Error spawning ${bold(name)}: ${err.message}`
    );
    return false;
  }
}

function openBrowser(port) {
  try {
    execSync(`open http://localhost:${port}`, { timeout: 5000 });
    console.log(`  ${colorize("🌐", CYAN)} Opened http://localhost:${port}`);
  } catch {
    console.log(
      `  ${colorize("🌐", CYAN)} Open: http://localhost:${port}`
    );
  }
}

// ─── Menu display ────────────────────────────────────────────────────────────

function renderMenu(projects) {
  console.clear();

  console.log("");
  console.log(`  ${bold("⚡ Dev Launcher")}`);
  console.log(`  ${DIM}────────────────────────────────────────────${RESET}`);
  console.log("");

  for (const p of projects) {
    const running = isPortInUse(p.port);
    const dot = running ? GREEN_DOT : GRAY_DOT;
    const numStr = String(p.num).padStart(2, " ");
    const typeLabel = p.name === "WeThePeople" ? "Exp" : p.configType === "vite" ? "Vit" : "Nxt";

    console.log(
      `  ${dot} ${bold(colorize(numStr, CYAN))}  ${bold(p.name.padEnd(22, " "))} ${colorize(typeLabel, DIM)}  ${colorize(`:${p.port}`, GRAY)}`
    );
  }

  console.log("");
  console.log(`  ${GRAY_DOT} = stopped    ${GREEN_DOT} = running`);
  console.log("");
  console.log(`  ${DIM}How to use:${RESET}`);
  console.log(`  ${bold("dev")}     — pick from menu → auto-starts + opens browser`);
  console.log(`  ${bold("dstop")}    — kill all dev servers on all ports`);
  console.log(`  ${bold("dboard")}   — open live dashboard at ${CYAN}localhost:1919${RESET}`);
  console.log(`  ${bold("dcreate")}  — scaffold new project, auto-assign port, update inventory`);
  console.log(`  ${DIM}────────────────────────────────────────────${RESET}`);
  console.log(`  Type a ${bold("number")} to launch, ${bold("r")} to refresh, ${bold("q")} to quit`);
  console.log("");
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  // Parse inventory
  let projects;
  try {
    projects = parseInventory(INVENTORY_PATH);
  } catch (err) {
    console.error(`${colorize("✖", RED)} Cannot read inventory: ${err.message}`);
    process.exit(1);
  }

  if (projects.length === 0) {
    console.error(`${colorize("✖", RED)} No projects found in inventory.`);
    process.exit(1);
  }

  projects.push({
    num: projects.length + 1,
    name: "Dev Dashboard",
    fullPath: path.resolve(__dirname, "..", "dev-dashboard"),
    port: 1919,
    configType: "dashboard",
  });

  // Setup readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Handle Ctrl+C gracefully
  let exiting = false;
  process.on("SIGINT", () => {
    if (exiting) return;
    exiting = true;
    console.log(`\n${colorize("👋", YELLOW)} Goodbye!`);
    rl.close();
    process.exit(0);
  });

  function prompt() {
    rl.question(`${colorize("→", CYAN)} `, (input) => {
      const trimmed = input.trim().toLowerCase();

      if (trimmed === "q" || trimmed === "quit" || trimmed === "exit") {
        console.log(`\n${colorize("👋", YELLOW)} Goodbye!`);
        rl.close();
        process.exit(0);
        return;
      }

      if (trimmed === "r" || trimmed === "refresh") {
        // Re-parse to pick up any changes
        try {
          projects = parseInventory(INVENTORY_PATH);
        } catch {
          // keep existing
        }
        renderMenu(projects);
        prompt();
        return;
      }

      const num = parseInt(trimmed, 10);
      if (isNaN(num) || num < 1 || num > projects.length) {
        console.log(
          `${colorize("⚠", YELLOW)} Enter a number 1–${projects.length}, 'r' to refresh, or 'q' to quit`
        );
        prompt();
        return;
      }

      const project = projects.find((p) => p.num === num);
      if (!project) {
        console.log(`${colorize("✖", RED)} Project #${num} not found.`);
        prompt();
        return;
      }

      // Launch the project
      const launched = launchProject(project);

      if (launched) {
        // Return to menu after a short display
        setTimeout(() => {
          renderMenu(projects);
          prompt();
        }, 1500);
      } else {
        prompt();
      }
    });
  }

  // Initial render
  renderMenu(projects);
  prompt();
}

main();
