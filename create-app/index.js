#!/usr/bin/env node

/**
 * create-app — Project scaffolding CLI for Ammaniel's dev tools.
 *
 * Usage: node ~/Developer/dev-tools/create-app/index.js
 *
 * Interactive prompts:
 *   1. Project name → kebab-case, creates under /Users/nakfaai/Developer/projects/
 *   2. Project type → Vite / Next.js / Expo (arrow-key selection)
 *   3. Auto-assigns next free port (scans inventory.md, skips 8888)
 *
 * Creates directory, scaffolds files, updates inventory.md + .localhost-ports.md.
 * Zero npm dependencies. Uses only Node.js built-ins.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync, spawnSync } = require("child_process");

// ─── Configuration ───────────────────────────────────────────────────────────

const APPS_ROOT = "/Users/nakfaai/Developer/projects";
const INVENTORY_PATH = path.join(APPS_ROOT, "inventory.md");
const PORTS_PATH = path.join(APPS_ROOT, ".localhost-ports.md");
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
const MAGENTA = "\x1b[35m";

function c(text, code) {
  return `${code}${text}${RESET}`;
}

function bold(text) {
  return `${BOLD}${text}${RESET}`;
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function kebabCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pascalCase(str) {
  return str
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/**
 * Parse the inventory table to extract all assigned ports.
 * Returns array of port numbers.
 */
function parseAssignedPorts(inventoryContent) {
  const ports = [];
  const lines = inventoryContent.split("\n");
  for (const line of lines) {
    // Match table rows: | # | App | Path | PORT | ...
    const match = line.match(/^\|\s*\d+\s*\|.*?\|\s*.*?\|\s*(\d+)\s*\|/);
    if (match) {
      ports.push(parseInt(match[1], 10));
    }
  }
  return ports;
}

/**
 * Determine the next free port.
 * Starts from 1919 (first port in the "1919+" range per inventory convention).
 * Also considers 3000+ range. Skips 8888 (reserved for Jupyter).
 */
function nextFreePort(assignedPorts) {
  let candidate = 1919;
  while (true) {
    if (candidate === RESERVED_PORT) {
      candidate++;
      continue;
    }
    if (!assignedPorts.includes(candidate)) {
      return candidate;
    }
    candidate++;
    // If we pass through all 1919-2999, continue into 3000+
    // (the assignment will always find the next free one sequentially)
  }
}

/**
 * Parse the inventory table to get current entry count and table lines.
 */
function parseInventoryTable(inventoryContent) {
  const lines = inventoryContent.split("\n");
  const tableStartIdx = lines.findIndex((l) => l.startsWith("| # |"));
  const tableEndIdx = lines.findIndex(
    (l, i) => i > tableStartIdx && l.trim() === "" && lines[i - 1].startsWith("|")
  );
  const tableHeader = lines[tableStartIdx];
  const tableRows = [];
  for (let i = tableStartIdx + 1; i < tableEndIdx; i++) {
    if (lines[i].startsWith("|") && !lines[i].includes("---")) {
      tableRows.push(lines[i]);
    }
  }
  return { tableHeader, tableRows, tableEndIdx, lines };
}

/**
 * Parse the .localhost-ports.md table.
 */
function parsePortsTable(portsContent) {
  const lines = portsContent.split("\n");
  const tableStartIdx = lines.findIndex((l) => l.startsWith("| # |"));
  const tableEndIdx = lines.findIndex(
    (l, i) => i > tableStartIdx && l.trim() === "" && lines[i - 1].startsWith("|")
  );
  const tableRows = [];
  for (let i = tableStartIdx + 1; i < tableEndIdx; i++) {
    if (lines[i].startsWith("|") && !lines[i].includes("---")) {
      tableRows.push(lines[i]);
    }
  }
  return { tableRows, tableEndIdx, lines };
}

// ─── File Templates ──────────────────────────────────────────────────────────

function viteIndexHtml(projectName) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pascalCase(projectName)}</title>
  </head>
  <body class="bg-white text-gray-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function viteConfigTs(port) {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: ${port},
    strictPort: true,
  },
  css: {
    postcss: "./postcss.config.js",
  },
});
`;
}

function viteMainTsx() {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function viteAppTsx() {
  return `function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">
        Hello World
      </h1>
    </div>
  );
}

export default App;
`;
}

function viteIndexCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

function vitePackageJson(projectName) {
  const pkg = {
    name: projectName,
    private: true,
    version: "0.0.1",
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc -b && vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1",
      "@vitejs/plugin-react": "^4.3.4",
      autoprefixer: "^10.4.20",
      postcss: "^8.4.49",
      tailwindcss: "^3.4.16",
      typescript: "~5.6.2",
      vite: "^6.0.1",
    },
  };
  return JSON.stringify(pkg, null, 2) + "\n";
}

function tailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
}

function postcssConfig() {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function tsconfigJson() {
  return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
`;
}

function nextjsPackageJson(projectName, port) {
  const pkg = {
    name: projectName,
    private: true,
    version: "0.0.1",
    scripts: {
      dev: `next dev -p ${port}`,
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      next: "^15.1.0",
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@types/node": "^22.10.0",
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1",
      autoprefixer: "^10.4.20",
      postcss: "^8.4.49",
      tailwindcss: "^3.4.16",
      typescript: "^5.6.3",
    },
  };
  return JSON.stringify(pkg, null, 2) + "\n";
}

function nextjsConfig() {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
`;
}

function nextjsLayoutTsx() {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`;
}

function nextjsPageTsx() {
  return `export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">
        Hello World
      </h1>
    </div>
  );
}
`;
}

function nextjsGlobalsCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

function nextjsTsconfig() {
  return `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;
}

function expoPackageJson(projectName, port) {
  const pkg = {
    name: projectName,
    private: true,
    version: "0.0.1",
    main: "expo/AppEntry.js",
    scripts: {
      start: `expo start --port ${port}`,
      android: "expo start --android",
      ios: "expo start --ios",
      web: "expo start --web",
    },
    dependencies: {
      expo: "~52.0.0",
      "expo-status-bar": "~2.0.0",
      react: "18.3.1",
      "react-native": "0.76.5",
    },
    devDependencies: {
      "@babel/core": "^7.25.2",
      typescript: "~5.3.3",
    },
  };
  return JSON.stringify(pkg, null, 2) + "\n";
}

function expoAppTsx() {
  return `import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2563eb",
  },
});
`;
}

function expoTsconfig() {
  return `{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
`;
}

// ─── Arrow-Key Menu ──────────────────────────────────────────────────────────

/**
 * Display an arrow-key selectable menu.
 * Returns a Promise that resolves with the selected option index.
 */
function selectMenu(title, options) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let selectedIndex = 0;
    const optionCount = options.length;

    function render() {
      // Clear previous render: move up optionCount+1 lines, clear each
      if (firstRender) {
        firstRender = false;
      } else {
        // Move cursor up and clear
        process.stdout.write(`\x1b[${optionCount + 1}A`);
        for (let i = 0; i < optionCount + 1; i++) {
          process.stdout.write("\x1b[2K\x1b[1B");
        }
        process.stdout.write(`\x1b[${optionCount + 1}A`);
      }

      console.log(`\n  ${bold(title)}`);
      for (let i = 0; i < optionCount; i++) {
        const prefix = i === selectedIndex ? `${GREEN}❯${RESET}` : " ";
        const text =
          i === selectedIndex
            ? `${BOLD}${options[i]}${RESET}`
            : `${GRAY}${options[i]}${RESET}`;
        console.log(`  ${prefix} ${text}`);
      }

      // Move cursor back up to top of menu
      process.stdout.write(`\x1b[${optionCount + 1}A`);
    }

    let firstRender = true;
    render();

    function onKeypress(str, key) {
      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + optionCount) % optionCount;
        render();
      } else if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % optionCount;
        render();
      } else if (key.name === "return") {
        cleanup();
        resolve(selectedIndex);
      } else if (key.name === "c" && key.ctrl) {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
    }

    process.stdin.on("keypress", onKeypress);
  });
}

/**
 * Simple text prompt. Returns trimmed user input.
 */
function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── File Writing Helpers ─────────────────────────────────────────────────────

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ${c("✓", GREEN)} Created directory ${c(dirPath, CYAN)}`);
  }
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  ${c("✓", GREEN)} Wrote ${c(filePath, CYAN)}`);
}

// ─── Inventory + Ports Update ─────────────────────────────────────────────────

function updateInventory(projectName, port, projectType, projectDir) {
  const inventoryContent = fs.readFileSync(INVENTORY_PATH, "utf8");
  const appName = pascalCase(projectName);
  const relPath = path.relative("/Users/nakfaai", projectDir);

  // Determine Config Type and Location
  let configType, configLocation;
  if (projectType === "Vite") {
    configType = "Vite";
    configLocation = `vite.config.ts: server.port ${port}`;
  } else if (projectType === "Next.js") {
    configType = "Next.js";
    configLocation = `package.json: next dev -p ${port}`;
  } else if (projectType === "Expo") {
    configType = "Expo";
    configLocation = `package.json: expo start --port ${port}`;
  }

  // Parse existing table to get next entry number
  const { tableRows, lines } = parseInventoryTable(inventoryContent);
  const entryNumber = tableRows.length + 1;

  // Build new row
  const newRow = `| ${entryNumber} | ${appName} | ${relPath} | ${port} | ${configType} | ${configLocation} | Pending |`;

  // Insert before the empty line after the table
  // Find where table ends (first empty line after the header row)
  let tableEndLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("| # |")) {
      // Find the end of the table section
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith("|")) {
          continue;
        }
        if (
          lines[j].trim() === "" ||
          lines[j].startsWith("##") ||
          lines[j].startsWith("#")
        ) {
          tableEndLine = j;
          break;
        }
      }
      break;
    }
  }

  // Insert new row at the end of the table
  lines.splice(tableEndLine, 0, newRow);

  // Update "Last updated" line
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Last updated:")) {
      lines[i] = `Last updated: ${today}`;
      break;
    }
  }

  fs.writeFileSync(INVENTORY_PATH, lines.join("\n"), "utf8");
  console.log(`  ${c("✓", GREEN)} Updated ${c(INVENTORY_PATH, CYAN)}`);
}

function updatePortsFile(projectName, port, projectType, projectDir) {
  const portsContent = fs.readFileSync(PORTS_PATH, "utf8");
  const appName = pascalCase(projectName);
  const relPath = projectDir.replace("/Users/nakfaai/", "");

  // Determine start command
  let startCommand;
  if (projectType === "Vite") {
    startCommand = "npx vite";
  } else if (projectType === "Next.js") {
    startCommand = "npm run dev";
  } else if (projectType === "Expo") {
    startCommand = "npx expo start";
  }

  // Parse existing table
  const { tableRows, lines } = parsePortsTable(portsContent);
  const entryNumber = tableRows.length + 1;

  // Build new row
  const newRow = `| ${entryNumber} | ${appName} | **${port}** | \`/${relPath}\` | \`${startCommand}\` | ${port} (assigned) |`;

  // Insert at end of table
  let tableEndLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("| # |")) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith("|")) {
          continue;
        }
        if (
          lines[j].trim() === "" ||
          lines[j].startsWith("##") ||
          lines[j].startsWith("#")
        ) {
          tableEndLine = j;
          break;
        }
      }
      break;
    }
  }

  lines.splice(tableEndLine, 0, newRow);

  // Update "Last verified" line
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Last verified:")) {
      lines[i] = lines[i].replace(
        /Last verified:.*/,
        `Last verified: ${today}.`
      );
      break;
    }
  }
  // Also update the count in "All X apps mapped"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("All ") && lines[i].includes("apps mapped")) {
      const totalApps = entryNumber;
      lines[i] = `All ${totalApps} apps mapped to dedicated localhost ports. Last verified: ${today}.`;
      break;
    }
  }

  fs.writeFileSync(PORTS_PATH, lines.join("\n"), "utf8");
  console.log(`  ${c("✓", GREEN)} Updated ${c(PORTS_PATH, CYAN)}`);
}

// ─── Scaffolders ─────────────────────────────────────────────────────────────

function scaffoldVite(projectDir, projectName, port) {
  console.log(`\n  ${c("⚡", YELLOW)} Scaffolding Vite + React + Tailwind project...`);

  ensureDir(projectDir);
  ensureDir(path.join(projectDir, "src"));

  writeFile(path.join(projectDir, "index.html"), viteIndexHtml(projectName));
  writeFile(path.join(projectDir, "vite.config.ts"), viteConfigTs(port));
  writeFile(path.join(projectDir, "package.json"), vitePackageJson(projectName));
  writeFile(path.join(projectDir, "tsconfig.json"), tsconfigJson());
  writeFile(path.join(projectDir, "tailwind.config.js"), tailwindConfig());
  writeFile(path.join(projectDir, "postcss.config.js"), postcssConfig());
  writeFile(path.join(projectDir, "src", "main.tsx"), viteMainTsx());
  writeFile(path.join(projectDir, "src", "App.tsx"), viteAppTsx());
  writeFile(path.join(projectDir, "src", "index.css"), viteIndexCss());
}

function scaffoldNextjs(projectDir, projectName, port) {
  console.log(
    `\n  ${c("▲", YELLOW)} Scaffolding Next.js + TypeScript + Tailwind project...`
  );

  ensureDir(projectDir);
  ensureDir(path.join(projectDir, "src"));
  ensureDir(path.join(projectDir, "src", "app"));

  writeFile(
    path.join(projectDir, "package.json"),
    nextjsPackageJson(projectName, port)
  );
  writeFile(path.join(projectDir, "tsconfig.json"), nextjsTsconfig());
  writeFile(path.join(projectDir, "next.config.ts"), nextjsConfig());
  writeFile(path.join(projectDir, "tailwind.config.ts"), tailwindConfig());
  writeFile(path.join(projectDir, "postcss.config.mjs"), postcssConfig());
  writeFile(
    path.join(projectDir, "src", "app", "layout.tsx"),
    nextjsLayoutTsx()
  );
  writeFile(
    path.join(projectDir, "src", "app", "page.tsx"),
    nextjsPageTsx()
  );
  writeFile(
    path.join(projectDir, "src", "app", "globals.css"),
    nextjsGlobalsCss()
  );
}

function scaffoldExpo(projectDir, projectName, port) {
  console.log(
    `\n  ${c("📱", YELLOW)} Scaffolding Expo + TypeScript project...`
  );

  ensureDir(projectDir);

  writeFile(
    path.join(projectDir, "package.json"),
    expoPackageJson(projectName, port)
  );
  writeFile(path.join(projectDir, "tsconfig.json"), expoTsconfig());
  writeFile(path.join(projectDir, "App.tsx"), expoAppTsx());
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log(
    `  ${bold(c("✦", MAGENTA))} ${bold("create-app")} ${DIM}— Ammaniel project scaffolder`
  );
  console.log("");

  // 1. Project name
  let projectName = "";
  while (!projectName) {
    projectName = await prompt(`  ${c("?", CYAN)} Project name (kebab-case): `);
    if (!projectName) {
      console.log(`  ${c("✗", RED)} Project name cannot be empty.`);
    }
  }
  projectName = kebabCase(projectName);
  console.log(`  ${c("→", GRAY)} Using name: ${c(projectName, GREEN)}`);

  const projectDir = path.join(APPS_ROOT, projectName);

  // Check if directory already exists
  if (fs.existsSync(projectDir)) {
    console.log(
      `\n  ${c("✗", RED)} Directory already exists: ${c(projectDir, CYAN)}`
    );
    const overwrite = await prompt(
      `  ${c("?", CYAN)} Overwrite? This is destructive. (yes/no): `
    );
    if (overwrite.toLowerCase() !== "yes") {
      console.log(`  ${c("✗", RED)} Aborted.`);
      process.exit(0);
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
    console.log(`  ${c("✓", GREEN)} Removed existing directory.`);
  }

  // 2. Project type (arrow-key selection)
  console.log("");
  const projectTypes = ["Vite", "Next.js", "Expo"];
  const selectedIndex = await selectMenu("Select project type:", projectTypes);
  const projectType = projectTypes[selectedIndex];

  // Move cursor down past menu
  process.stdout.write(`\x1b[${projectTypes.length + 1}B`);
  console.log(`  ${c("→", GRAY)} Selected: ${c(projectType, GREEN)}`);

  // 3. Auto-assign port
  const inventoryContent = fs.readFileSync(INVENTORY_PATH, "utf8");
  const assignedPorts = parseAssignedPorts(inventoryContent);
  const port = nextFreePort(assignedPorts);
  console.log(`  ${c("→", GRAY)} Assigned port: ${c(String(port), GREEN)}`);

  // 4. Scaffold
  console.log(`\n  ${c("⚙", YELLOW)} Creating project directory...`);
  if (projectType === "Vite") {
    scaffoldVite(projectDir, projectName, port);
  } else if (projectType === "Next.js") {
    scaffoldNextjs(projectDir, projectName, port);
  } else if (projectType === "Expo") {
    scaffoldExpo(projectDir, projectName, port);
  }

  // 5. Update inventory and ports files
  console.log(`\n  ${c("⚙", YELLOW)} Updating inventory files...`);
  updateInventory(projectName, port, projectType, projectDir);
  updatePortsFile(projectName, port, projectType, projectDir);

  // 6. Install dependencies?
  console.log("");
  const install = await prompt(
    `  ${c("?", CYAN)} Install dependencies now? (yes/no): `
  );
  if (install.toLowerCase() === "yes") {
    console.log(`\n  ${c("⚙", YELLOW)} Running npm install...`);
    try {
      spawnSync("npm", ["install"], {
        cwd: projectDir,
        stdio: "inherit",
        shell: true,
      });
      console.log(`  ${c("✓", GREEN)} Dependencies installed.`);
    } catch (err) {
      console.log(
        `  ${c("✗", RED)} npm install failed. Run manually: cd ${projectDir} && npm install`
      );
    }
  }

  // 7. Done
  console.log("");
  console.log(`  ${c("✓", GREEN)} ${bold("Done!")} Project created at ${c(projectDir, CYAN)}`);
  console.log(
    `  ${c("→", GRAY)} Launch with: ${c(`node ~/Developer/dev-tools/dev-launcher`, GREEN)}`
  );
  console.log("");
}

main().catch((err) => {
  console.error(`\n  ${c("✗", RED)} Error: ${err.message}`);
  process.exit(1);
});
