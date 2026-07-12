#!/usr/bin/env node

/**
 * deploy-setup — Generate GitHub Actions CI/CD workflow for a Next.js app on Hostinger.
 *
 * Usage: node ~/dev-tools/deploy-setup/index.js [app-path]
 *
 * Creates .github/workflows/deploy.yml with:
 *   - Build in CI (never on Hostinger — shared hosting OOMs)
 *   - SCP standalone output to Hostinger
 *   - PM2 restart via SSH
 *
 * Prints checklist of GitHub secrets to set.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((r) => rl.question(q, r));
}

function green(t) {
  return `\x1b[32m${t}\x1b[0m`;
}
function yellow(t) {
  return `\x1b[33m${t}\x1b[0m`;
}
function bold(t) {
  return `\x1b[1m${t}\x1b[0m`;
}

async function main() {
  console.log(bold("\n🚀 Deploy Setup — GitHub Actions CI for Hostinger\n"));

  // ─── App path ───────────────────────────────────────────────────────────────
  let appPath = process.argv[2];
  if (!appPath) {
    appPath = await ask("App path (relative to ~/myapps/ or absolute): ");
  }
  if (!appPath.startsWith("/")) {
    appPath = path.join("/Users/ammaniel/myapps", appPath);
  }
  appPath = path.resolve(appPath);

  if (!fs.existsSync(appPath)) {
    console.error(`❌ Path not found: ${appPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(appPath, "next.config.ts")) && !fs.existsSync(path.join(appPath, "next.config.js")) && !fs.existsSync(path.join(appPath, "next.config.mjs"))) {
    const yn = await ask("⚠️  No next.config.* found. Is this a Next.js app? (y/N): ");
    if (yn.toLowerCase() !== "y") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  const appName = path.basename(appPath);
  console.log(`📁 App: ${bold(appName)} @ ${appPath}\n`);

  // ─── Domain ─────────────────────────────────────────────────────────────────
  const domain = await ask("Domain (e.g. agelbook.com): ");
  if (!domain.includes(".")) {
    console.error("❌ Invalid domain. Must contain a dot.");
    process.exit(1);
  }

  // ─── Branch ─────────────────────────────────────────────────────────────────
  const branch = (await ask("Git branch to deploy from (default: main): ")) || "main";

  // ─── Detect Firebase Admin ──────────────────────────────────────────────────
  const hasFirebaseAdmin =
    fs.existsSync(path.join(appPath, "node_modules/firebase-admin")) ||
    fs.existsSync(path.join(appPath, "lib/firebase-admin.ts")) ||
    (await readFileSafe(path.join(appPath, "package.json"))).includes("firebase-admin");

  // ─── Check for NEXT_PUBLIC_ variables ───────────────────────────────────────
  const envPath = path.join(appPath, ".env");
  const envExamplePath = path.join(appPath, ".env.example");
  let publicVars = [];

  // Scan .env* files for NEXT_PUBLIC_ entries
  const envFiles = [envPath, envExamplePath, path.join(appPath, ".env.local")];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, "utf-8");
      const matches = content.matchAll(/^NEXT_PUBLIC_(\w+)=/gm);
      for (const m of matches) {
        const name = `NEXT_PUBLIC_${m[1]}`;
        if (!publicVars.includes(name)) publicVars.push(name);
      }
    }
  }

  // Also scan source files for process.env.NEXT_PUBLIC_
  const { execSync } = require("child_process");
  try {
    const grep = execSync(
      `grep -rho 'NEXT_PUBLIC_[A-Z_]*' "${appPath}/src" "${appPath}/app" "${appPath}/lib" "${appPath}/components" 2>/dev/null | sort -u`,
      { encoding: "utf-8", maxBuffer: 1024 * 1024 }
    );
    for (const v of grep.trim().split("\n")) {
      if (v && !publicVars.includes(v)) publicVars.push(v);
    }
  } catch (_) {
    // grep found nothing
  }

  // Add GOOGLE_MAPS if detected
  if (!publicVars.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")) {
    const hasGmaps = execSync(
      `grep -rl 'google.maps\\|GoogleMap\\|MapView\\|GOOGLE_MAPS' "${appPath}/src" "${appPath}/app" "${appPath}/lib" "${appPath}/components" 2>/dev/null`,
      { encoding: "utf-8", maxBuffer: 1024 * 1024 }
    );
    if (hasGmaps.trim()) publicVars.push("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  }

  console.log(`🌐 Domain: ${green(domain)}`);
  console.log(`📦 Branch: ${green(branch)}`);
  console.log(`🔑 Public env vars detected: ${publicVars.length ? green(publicVars.join(", ")) : yellow("none found")}`);
  if (hasFirebaseAdmin) {
    console.log(`🔥 Firebase Admin: ${yellow("detected — ensure getAdminAuth() lazy init")}`);
  }
  console.log("");

  // ─── Generate workflow ──────────────────────────────────────────────────────
  const workflowDir = path.join(appPath, ".github", "workflows");
  fs.mkdirSync(workflowDir, { recursive: true });

  const envStep = publicVars.length
    ? publicVars.map((v) => `          echo "${v}=\${{ secrets.${v} }}" >> .env.tmp`).join("\n")
    : `          echo "# No NEXT_PUBLIC_ vars detected"`;

  const workflow = `name: Deploy to Hostinger

on:
  push:
    branches: [${branch}]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Create .env with build-time vars
        run: |
${envStep}

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build

      - name: Prepare standalone deploy directory
        run: |
          mkdir -p deploy
          cp -r .next/standalone/. deploy/
          rm -rf deploy/.next/static
          cp -r .next/static deploy/.next/static
          cp -r public deploy/public
          cp ecosystem.config.js deploy/ 2>/dev/null || true

      - name: Deploy to Hostinger via SCP
        uses: appleboy/scp-action@v0.1.7
        with:
          host: \${{ secrets.HOSTINGER_HOST }}
          port: \${{ secrets.HOSTINGER_PORT }}
          username: \${{ secrets.HOSTINGER_USER }}
          key: \${{ secrets.HOSTINGER_SSH_KEY }}
          source: "deploy"
          target: "/home/u885017975/domains/${domain}/public_html"
          strip_components: 1

      - name: Restart PM2 on Hostinger
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: \${{ secrets.HOSTINGER_HOST }}
          port: \${{ secrets.HOSTINGER_PORT }}
          username: \${{ secrets.HOSTINGER_USER }}
          key: \${{ secrets.HOSTINGER_SSH_KEY }}
          script: |
            export PATH=\$HOME/.npm-global/bin:\$PATH
            cd /home/u885017975/domains/${domain}/public_html
            pm2 kill
            pm2 start ecosystem.config.js
            pm2 save
`;

  const workflowPath = path.join(workflowDir, "deploy.yml");
  fs.writeFileSync(workflowPath, workflow);
  console.log(green(`✅ Created: ${workflowPath}\n`));

  // ─── Secrets checklist ──────────────────────────────────────────────────────
  console.log(bold("📋 GitHub Secrets to set (in repo → Settings → Secrets and variables → Actions):"));
  console.log("");
  console.log(`  ${bold("SSH (same for all Hostinger apps):")}`);
  console.log(`    HOSTINGER_HOST    45.89.204.208`);
  console.log(`    HOSTINGER_PORT    65002`);
  console.log(`    HOSTINGER_USER    u885017975`);
  console.log(`    HOSTINGER_SSH_KEY  (contents of ~/.ssh/ammaniel-deploy)`);
  console.log("");

  if (publicVars.length) {
    console.log(`  ${bold("Build-time env vars (NEXT_PUBLIC_*):")}`);
    for (const v of publicVars) {
      console.log(`    ${v}`);
    }
    console.log("");
  }

  console.log(`  ${bold("Runtime secrets (Hostinger hPanel → Environment Variables — NOT GitHub):")}`);
  console.log(`    DATABASE_URL`);
  console.log(`    STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET`);
  console.log(`    SMTP_* / GOOGLE_CLIENT_* / APPLE_*`);
  console.log("");

  if (hasFirebaseAdmin) {
    console.log(yellow(`⚠️  Firebase Admin detected — make sure init is lazy:`));
    console.log(yellow(`   lib/firebase-admin.ts should export getAdminAuth() function,`));
    console.log(yellow(`   not a module-level adminAuth. Otherwise CI build crashes.`));
    console.log("");
  }

  // ─── Check ecosystem.config.js for hardcoded PORT ─────────────────────────
  const ecPath = path.join(appPath, "ecosystem.config.js");
  if (fs.existsSync(ecPath)) {
    const ec = fs.readFileSync(ecPath, "utf-8");
    if (ec.includes("PORT:")) {
      console.log(yellow(`⚠️  ecosystem.config.js has hardcoded PORT — remove it:`));
      console.log(yellow(`   Hostinger assigns the port dynamically. PORT: \"xxxx\" breaks deploy.`));
      console.log(yellow(`   Edit ${ecPath} to remove PORT from the env block.`));
      console.log("");
    }
  }

  console.log(bold("🚀 First deploy:") + ` git add .github/workflows/deploy.yml && git commit -m "Add CI/CD" && git push origin ${branch}`);
  console.log("");

  rl.close();
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return "";
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
