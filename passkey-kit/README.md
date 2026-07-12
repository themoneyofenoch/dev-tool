# Passkey Kit — WebAuthn Face ID / Touch ID

Drop-in passkey auth for any Express + React app. Works on localhost (dev) and HTTPS (production).

## What you get
- **Passwordless-first**: Create account with just name + email + Face ID
- **Sign in with Face ID**: One-tap login for returning users
- **Post-login prompt**: Blue banner offers to set up Face ID if none exists

## Files

| File | What | Where to put |
|---|---|---|
| `backend/routes/passkeys.js` | All WebAuthn endpoints | `backend/routes/passkeys.js` |
| `backend/db-table.sql` | SQL for passkeys table | Add to your schema init |
| `frontend/components/PasskeyLogin.jsx` | Buttons for login page | Import into your Login.jsx |
| `frontend/components/PasskeySettings.jsx` | Add/remove passkeys | Import into settings page |
| `frontend/components/PasskeyBanner.jsx` | Post-login setup prompt | Import into dashboard |
| `frontend/hooks/usePasskey.jsx` | Shared passkey logic | `frontend/src/hooks/usePasskey.jsx` |

## Setup

### 1. Install deps
```bash
cd backend && npm install @simplewebauthn/server
cd frontend && npm install @simplewebauthn/browser
```

### 2. Database
Add to your schema init (e.g. `db.js`):
```sql
CREATE TABLE IF NOT EXISTS passkeys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT DEFAULT '',
  device_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);
```

### 3. Backend
In `server.js`:
```js
import passkeyRoutes from './routes/passkeys.js';
app.use('/api', passkeyRoutes);
```

**Important**: Mount passkey routes BEFORE any other `/api` routers that have `router.use(authMiddleware)` at the router level. The `login/begin` endpoint needs to be reachable without auth.

### 4. Customize `passkeys.js`
Open `backend/routes/passkeys.js` and:
- Replace `APP_NAME` with your app name (e.g. `"Gardenia ALF"`)
- Replace `JWT_EXPIRY` if you want different token lifetime
- If your user model differs, adjust the user creation in `register/complete/noauth` and the user lookup in `login/complete`

### 5. Frontend
In your `Login.jsx`:
```jsx
import PasskeyLogin from './PasskeyLogin';
// Add <PasskeyLogin /> below your password form
```

In your dashboard (after login):
```jsx
import PasskeyBanner from './PasskeyBanner';
// Add <PasskeyBanner /> at the top of dashboard content
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/passkey/register/begin/noauth` | No | Start passkey-first registration |
| `POST` | `/api/auth/passkey/register/complete/noauth` | No | Complete + create user |
| `POST` | `/api/auth/passkey/register/begin` | Yes | Add passkey to existing user |
| `POST` | `/api/auth/passkey/register/complete` | Yes | Store new credential |
| `POST` | `/api/auth/passkey/login/begin` | No | Start authentication |
| `POST` | `/api/auth/passkey/login/complete` | No | Complete + issue JWT |
| `GET` | `/api/auth/passkeys` | Yes | List user's passkeys |
| `DELETE` | `/api/auth/passkey/:id` | Yes | Remove a passkey |

## Notes
- v13 of `@simplewebauthn/server` changed: `credential.id` is `Base64URLString` (string), `credential.publicKey` is `Uint8Array`
- Passkeys are scoped to origin — localhost passkeys won't work on production
- Firefox on macOS doesn't support Face ID — use Chrome or Safari
