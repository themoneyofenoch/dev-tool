#!/usr/bin/env node

/**
 * dev-stop — Kill all dev servers across known project ports.
 *
 * Uses lsof to find PIDs bound to each port, sends SIGTERM first,
 * then SIGKILL after 2s for survivors.
 *
 * Usage:
 *   node dev-stop            # kill all
 *   node dev-stop 3333       # kill specific port
 *   node dev-stop 3333 4444  # kill multiple ports
 *
 * Exports:
 *   killAll()  — kill all known ports
 *   killPort(port) — kill a single port
 */

const { execSync } = require("child_process");

// Port → project name mapping (from inventory.md & .localhost-ports.md)
const PORT_MAP = {
  2222: "GeezEasy",
  3333: "Latin Dance Hub",
  4444: "Mizaney",
  5555: "Salon Booking",
  6666: "Habesha Wedding",
  7777: "Nakfa Marketplace",
  9999: "WeThePeople",
  1111: "Ethiocoffee",
  1212: "BookThem",
  1313: "Gottasee",
  1414: "Ammaniel Hintza",
  1515: "Ammanuniverse",
  1616: "Genzeb/EthioRemit",
  1717: "Customer Pages",
  1818: "AmmanielHitza",
  1919: "Unknown (future app)",
};

const ALL_PORTS = Object.keys(PORT_MAP).map(Number);

/**
 * Get PIDs listening on a given port.
 * Returns empty array if port is free or lsof fails.
 */
function getPids(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((s) => Number(s.trim()));
  } catch {
    return [];
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a signal to a PID. Swallows errors (process may have already died).
 */
function sendSignal(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kill all processes on a single port.
 * Returns { port, name, pids: number[], sigterm: number[], sigkill: number[] }
 */
async function killPort(port) {
  const portNum = Number(port);
  const name = PORT_MAP[portNum] || `Unknown (port ${portNum})`;
  const pids = getPids(portNum);

  if (pids.length === 0) {
    return { port: portNum, name, pids: [], sigterm: [], sigkill: [] };
  }

  // Phase 1: SIGTERM
  const sigterm = [];
  for (const pid of pids) {
    if (sendSignal(pid, "SIGTERM")) sigterm.push(pid);
  }

  // Phase 2: wait for graceful shutdown
  await sleep(2000);

  // Phase 3: SIGKILL survivors
  const sigkill = [];
  for (const pid of pids) {
    if (isAlive(pid)) {
      sendSignal(pid, "SIGKILL");
      sigkill.push(pid);
    }
  }

  return { port: portNum, name, pids, sigterm, sigkill };
}

/**
 * Kill all known dev server ports.
 * Returns array of results from killPort().
 */
async function killAll(ports) {
  const targets = ports || ALL_PORTS;
  const results = [];

  for (const port of targets) {
    const result = await killPort(port);
    results.push(result);
    printSingle(result);
  }

  printSummary(results);
  return results;
}

function printSingle(result) {
  const { port, name, pids, sigterm, sigkill } = result;

  if (pids.length === 0) {
    console.log(`  ✓ ${port}  ${name} — free`);
    return;
  }

  const parts = [`  ✕ ${port}  ${name} — PID(s) ${pids.join(", ")}`];
  if (sigterm.length > 0) parts.push(`SIGTERM`);
  if (sigkill.length > 0) parts.push(`SIGKILL (${sigkill.length} survivor(s))`);
  console.log(parts.join(", "));
}

function printSummary(results) {
  const killed = results.filter((r) => r.pids.length > 0);
  const forced = results.filter((r) => r.sigkill.length > 0);
  const total = results.length;

  console.log();
  console.log("─".repeat(50));
  if (killed.length === 0) {
    console.log("No dev servers were running.");
  } else {
    console.log(
      `Killed ${killed.length}/${total} server(s) (${forced.length} needed SIGKILL).`
    );
    console.log(
      `Projects stopped: ${killed.map((r) => r.name).join(", ")}`
    );
  }
  console.log("─".repeat(50));
}

// ─── CLI entry point ────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2).map(Number).filter(Boolean);

  if (args.length > 0) {
    // Kill specified ports
    const unknown = args.filter((p) => !PORT_MAP[p] && p !== 8888);
    if (unknown.length > 0) {
      console.warn(
        `Warning: port(s) ${unknown.join(", ")} not in known project list. Will still attempt to kill.`
      );
    }
    killAll(args).catch((err) => {
      console.error("dev-stop error:", err.message);
      process.exit(1);
    });
  } else {
    // Kill all known ports
    killAll().catch((err) => {
      console.error("dev-stop error:", err.message);
      process.exit(1);
    });
  }
}

module.exports = { killAll, killPort };
