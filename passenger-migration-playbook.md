# Passenger Migration Playbook

> Switch any Hostinger Node.js app from PM2+PHP proxy to Passenger.
> Same architecture as nakfaai.com — one layer, no corrupt cache, never crashes.

---

## Why

**Before:** LiteSpeed → PHP proxy → PM2 → Express (3 layers)
**After:**  LiteSpeed → Passenger → Express (1 layer)

Passenger is built into Hostinger's LiteSpeed. It auto-starts Node when a request comes in. No separate PM2 daemon to corrupt, no PHP proxy disk cache to serve garbage.

---

## Prerequisites

Your Express server (`server.js`) must serve everything:

```js
// Static frontend
app.use(express.static(path.join(__dirname, "dist")));

// API routes (after static)
app.use("/api/blog", blogRoutes);
app.use("/cms", cmsRoutes);
// ...

// SPA fallback (LAST — after all API routes)
app.use("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
```

---

## Step 1 — Passenger .htaccess

Place this at `public_html/.htaccess` in your backend directory. Replace `YOUR_DOMAIN` with the actual domain (twice — in `PassengerAppRoot`).

```apache
RewriteEngine On
RewriteBase /

<IfModule LiteSpeed>
  CacheDisable public /
  CacheDisable private /
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "\.(svg|webp|png|jpg|jpeg|gif|ico|woff2?)$">
    Header set Cache-Control "public, immutable, max-age=31536000"
  </FilesMatch>
  <FilesMatch "\.(js|css)$">
    Header set Cache-Control "public, max-age=3600"
  </FilesMatch>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  Header set CDN-Cache-Control "no-cache"
</IfModule>
DirectoryIndex index.html index.php

# Block WordPress entrypoints
RewriteRule ^wp-login\.php$ / [R=301,L]
RewriteRule ^wp-admin/?$ / [R=301,L]
RewriteRule ^wp-admin/(.*)$ / [R=301,L]

PassengerEnabled on
PassengerAppRoot /home/u885017975/domains/YOUR_DOMAIN/nodejs
PassengerAppType node
PassengerStartupFile server.js
PassengerBaseURI /
```

---

## Step 2 — Update postinstall

Replace the `postinstall` in your backend's `package.json`. This one:
- Copies files to persistent `nodejs/`
- Creates `tmp/` (Passenger needs this)
- Deploys the `.htaccess` to `public_html/`
- Kills PM2

```json
"postinstall": "rm -f .env .env.* 2>/dev/null; mkdir -p node_modules/iconv-lite/encodings node_modules/mysql2/node_modules/iconv-lite/encodings 2>/dev/null; cp -r fix/iconv-encodings/* node_modules/iconv-lite/encodings/ 2>/dev/null; cp -r fix/iconv-encodings/* node_modules/mysql2/node_modules/iconv-lite/encodings/ 2>/dev/null; NODEJS=\"$(dirname \"$(dirname \"$(dirname \"$(pwd)\")\")\")/nodejs\"; DOMAINROOT=\"$(dirname \"$NODEJS\")\"; echo \"Copying to $NODEJS...\"; cp server.js \"$NODEJS/server.js\" 2>/dev/null; cp package.json \"$NODEJS/package.json\" 2>/dev/null; [ -d dist ] && cp -r dist \"$NODEJS/dist\" 2>/dev/null; [ -d src ] && cp -r src \"$NODEJS/src\" 2>/dev/null; [ -d fix ] && cp -r fix \"$NODEJS/fix\" 2>/dev/null; mkdir -p \"$NODEJS/node_modules/iconv-lite/encodings\" \"$NODEJS/node_modules/mysql2/node_modules/iconv-lite/encodings\" 2>/dev/null; cp -r fix/iconv-encodings/* \"$NODEJS/node_modules/iconv-lite/encodings/\" 2>/dev/null; cp -r fix/iconv-encodings/* \"$NODEJS/node_modules/mysql2/node_modules/iconv-lite/encodings/\" 2>/dev/null; mkdir -p \"$DOMAINROOT/tmp\"; touch \"$DOMAINROOT/tmp/restart.txt\"; cp public_html/.htaccess \"$DOMAINROOT/public_html/.htaccess\" 2>/dev/null; cd \"$NODEJS\" && node node_modules/pm2/bin/pm2 kill 2>/dev/null; exit 0"
```

If your app doesn't use `iconv-lite` (no MySQL), remove those lines from postinstall.

---

## Step 3 — Build & Deploy

```bash
# 1. Build frontend
cd /path/to/frontend && npm run build

# 2. Copy dist into backend
cp -r dist /path/to/backend/dist

# 3. Archive (exclude node_modules)
cd /path/to/backend
zip -r /tmp/deploy.zip . -x "node_modules/*" -x ".env*" -x "*.zip" -x ".git/*"

# 4. Deploy via Hostinger API MCP
# Use: hostinger-api_hosting_deployJsApplication(domain="YOUR_DOMAIN", archivePath="/tmp/deploy.zip")
```

---

## Step 4 — Verify

After deploy completes (~1 min), check:

```bash
# Site loads
curl -s https://YOUR_DOMAIN/

# API healthy
curl -s https://YOUR_DOMAIN/api/health

# PM2 has no processes
node ~/domains/YOUR_DOMAIN/nodejs/node_modules/pm2/bin/pm2 list

# Passenger restart works
hostinger_passenger_restart site="YOUR_DOMAIN"
```

---

## Cleanup (after migration confirmed working)

- [ ] Delete `public_html/api/proxy.php` and `public_html/cms/proxy.php`
- [ ] Delete `ecosystem.config.js` if exists
- [ ] Save PM2 state clean: `node node_modules/pm2/bin/pm2 save --force`
- [ ] Delete `/tmp/proxy-cache/` directory on server

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Passenger not configured" on restart | `tmp/` missing. Run `mkdir -p ~/domains/DOMAIN/tmp && touch ~/domains/DOMAIN/tmp/restart.txt` |
| API returns HTML | .htaccess missing or PassengerBaseURI wrong. Check `public_html/.htaccess` |
| EADDRINUSE on deploy | Old Express still on port 3000. Kill PM2: `node node_modules/pm2/bin/pm2 kill` |
| CDN shows old content | Wait 1-4 hours, or purge via Hostinger hPanel → CDN |
