#!/usr/bin/env node

/**
 * Devv Launcher CLI — Customer Pages
 * Numbered menu to pick a customer project, start it, and open the browser.
 *
 * Usage: node devv-launcher/index.js
 *      or: devv (via zsh alias)
 *
 * Reads /Users/ammaniel/myapps/others/inventory.md for the project table.
 * Detects running status via `lsof -ti :{port}`.
 * Spawns dev server with child_process.spawn and opens browser.
 *
 * Separate from the main "dev" launcher — these are customer pages,
 * not Ammaniel's own projects.
 */

const { spawn } = require("child_process");
const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

// ─── Configuration ───────────────────────────────────────────────────────────

const INVENTORY_PATH = "/Users/ammaniel/myapps/others/inventory.md";
const APPS_ROOT = "/Users/ammaniel/myapps/others";

// ─── Color helpers (ANSI — no dependencies) ──────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";
const PURPLE = "\x1b[35m";

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
 *
 * Supported types:
 *   vite    → npx vite --port {port}
 *   nextjs  → npm run dev (port already in project script)
 *   express → npm run dev (nodemon from package.json)
 *   cra     → PORT={port} npm start (Create React App)
 *   static  → npx serve . -l {port} (static HTML)
 */
function getStartCommand(project) {
  const { port, configType, name } = project;

  if (configType === "vite") {
    return {
      cmd: "npx",
      args: ["vite", "--port", String(port)],
      label: `npx vite --port ${port}`,
    };
  }

  if (configType === "nextjs" || configType === "next.js") {
    return {
      cmd: "npm",
      args: ["run", "dev"],
      label: "npm run dev",
    };
  }

  if (configType === "express") {
    return {
      cmd: "npm",
      args: ["run", "dev"],
      label: "npm run dev",
    };
  }

  if (configType === "cra") {
    return {
      cmd: "npm",
      args: ["start"],
      label: `PORT=${port} npm start`,
      env: { ...process.env, PORT: String(port), BROWSER: "none" },
    };
  }

  if (configType === "static") {
    return {
      cmd: "npx",
      args: ["serve", ".", "-l", String(port), "--no-clipboard"],
      label: `npx serve . -l ${port}`,
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

  const { cmd, args, label, env } = getStartCommand(project);

  console.log(
    `${colorize("▶", GREEN)} Starting ${bold(name)} on port ${bold(String(port))}…`
  );
  console.log(`  ${colorize("$", DIM)} cd ${fullPath} && ${label}`);
  console.log("");

  try {
    const spawnOpts = {
      cwd: fullPath,
      detached: true,
      stdio: "inherit",
      shell: true, // needed for npx resolution
    };

    if (env) {
      spawnOpts.env = env;
    }

    const child = spawn(cmd, args, spawnOpts);

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
  console.log(`  ${bold(`${PURPLE}👥${RESET} Devv Launcher — Customer Pages`)}`);
  console.log(`  ${DIM}────────────────────────────────────────────${RESET}`);
  console.log("");

  for (const p of projects) {
    const running = isPortInUse(p.port);
    const dot = running ? GREEN_DOT : GRAY_DOT;
    const numStr = String(p.num).padStart(2, " ");
    const typeLabel =
      p.configType === "vite" ? "Vit" :
      p.configType === "nextjs" ? "Nxt" :
      p.configType === "express" ? "Exp" :
      p.configType === "cra" ? "CRA" :
      p.configType === "static" ? "Stc" :
      "?";

    console.log(
      `  ${dot} ${bold(colorize(numStr, PURPLE))}  ${bold(p.name.padEnd(22, " "))} ${colorize(typeLabel, DIM)}  ${colorize(`:${p.port}`, GRAY)}`
    );
  }

  console.log("");
  console.log(`  ${GRAY_DOT} = stopped    ${GREEN_DOT} = running`);
  console.log("");
  console.log(`  ${DIM}How to use:${RESET}`);
  console.log(`  ${bold("devv")}    — pick from menu → auto-starts + opens browser`);
  console.log(`  ${bold("dstop")}   — kill all dev servers on all ports`);
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
    console.error(`  Expected at: ${INVENTORY_PATH}`);
    process.exit(1);
  }

  if (projects.length === 0) {
    console.error(`${colorize("✖", RED)} No projects found in inventory.`);
    process.exit(1);
  }

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
    rl.question(`${colorize("→", PURPLE)} `, (input) => {
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
          console.log(`\n${colorize("✓", GREEN)} Inventory refreshed — ${projects.length} projects loaded.\n`);
        } catch (err) {
          console.log(`\n${colorize("✖", RED)} Failed to refresh: ${err.message}\n`);
        }
        setTimeout(() => {
          renderMenu(projects);
          prompt();
        }, 800);
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
