#!/usr/bin/env node

/**
 * Dev Dashboard — CLI status table.
 *
 * Parses inventory.md, checks `lsof -ti :{port}` for each project,
 * and prints a clean table with status dots.
 *
 * Usage: node dev-dashboard/status-cli.js
 *        npm run ls          (from dev-tools root)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Configuration ───────────────────────────────────────────────────────────

const INVENTORY_PATH = "/Users/ammaniel/myapps/inventory.md";
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

    // Skip separator rows (|---|) and header
    if (/^\|[\s\-:]+\|/.test(trimmed)) continue;
    if (/^\|\s*#\s*\|/.test(trimmed)) {
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
    const port = parseInt(cells[3], 10);
    if (isNaN(port)) continue;
    if (port === RESERVED_PORT) continue;

    const configType = cells[4] || "";

    projects.push({ num, name, port, configType });
  }

  return projects;
}

// ─── Port / PID check ────────────────────────────────────────────────────────

function checkPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 2000,
    }).trim();
    return pids ? pids.split("\n") : [];
  } catch {
    return [];
  }
}

// ─── Pretty print ────────────────────────────────────────────────────────────

function printTable(projects) {
  let maxNameLen = 4;
  let maxTypeLen = 4;
  for (const p of projects) {
    if (p.name.length > maxNameLen) maxNameLen = p.name.length;
    if (p.configType.length > maxTypeLen) maxTypeLen = p.configType.length;
  }

  if (maxNameLen > 40) maxNameLen = 40;
  if (maxTypeLen > 20) maxTypeLen = 20;

  const headerLine =
    " " +
    "".padEnd(3) +
    "  " +
    "App".padEnd(maxNameLen) +
    "  " +
    "Port".padEnd(5) +
    "  " +
    "Type".padEnd(maxTypeLen) +
    "  " +
    "PIDs";

  const sep =
    " " +
    "".padEnd(3, "─") +
    "──" +
    "".padEnd(maxNameLen, "─") +
    "──" +
    "".padEnd(5, "─") +
    "──" +
    "".padEnd(maxTypeLen, "─") +
    "──" +
    "".padEnd(8, "─");

  let runningCount = 0;
  let stoppedCount = 0;

  const rows = projects.map((p) => {
    const pids = checkPort(p.port);
    const isRunning = pids.length > 0;
    if (isRunning) runningCount++;
    else stoppedCount++;

    const dot = isRunning ? "\x1b[32m●\x1b[0m" : "\x1b[31m○\x1b[0m";
    const name = p.name.length > 40 ? p.name.slice(0, 37) + "..." : p.name;
    const type = p.configType.length > 20 ? p.configType.slice(0, 17) + "..." : p.configType;
    const pidStr = isRunning ? pids.join(",") : "";

    return ` ${dot}  ${name.padEnd(maxNameLen)}  \x1b[90m${String(p.port).padEnd(5)}\x1b[0m  ${(type || "-").padEnd(maxTypeLen)}  \x1b[90m${pidStr}\x1b[0m`;
  });

  console.log("");
  console.log("  \x1b[1mDev Tools — Status\x1b[0m");
  console.log("  " + "─".repeat(40));
  console.log(headerLine);
  console.log(sep);
  console.log(rows.join("\n"));
  console.log("  " + "─".repeat(40));
  console.log(`  \x1b[32m● Running:\x1b[0m ${runningCount}   \x1b[31m○ Stopped:\x1b[0m ${stoppedCount}   Total: ${projects.length}`);
  console.log("");
}

// ─── Main ────────────────────────────────────────────────────────────────────

let projects;
try {
  projects = parseInventory(INVENTORY_PATH);
} catch (err) {
  console.error(`Error: Cannot read inventory at ${INVENTORY_PATH}`);
  console.error(err.message);
  process.exit(1);
}

if (projects.length === 0) {
  console.log("  No projects found in inventory.");
  process.exit(0);
}

printTable(projects);
