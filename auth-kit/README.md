# Auth Kit — Firebase + Passkey

**One auth system for all your apps (web + Capacitor).**

## Architecture

```
User clicks "Sign in with Google"
        │
        ▼
Firebase Auth SDK (web)     ← pops popup/redirect
        │
        ▼
Firebase ID token          ← short-lived (1hr)
        │
        ▼
Your backend               ← verifies token via Firebase Admin SDK
        │
        ▼
Your JWT                   ← your app's long-lived token (90d)
  + user record created
```

## Why Firebase + Your JWT

| Layer | What | Why |
|---|---|---|
| **Firebase Auth** | Google, Apple, Email/Password sign-in | Handles all the OAuth complexity, refresh tokens, email verification |
| **Your JWT** | Your app's session token | Your routes check your JWT, not Firebase tokens every time. Cleaner, faster. |

## Auth Options Per App

| App Type | Google | Apple | Passkey | Email/Password |
|---|---|---|---|---|
| **Web** | Firebase popup ✓ | Firebase popup ✓ | WebAuthn ✓ | Firebase ✓ |
| **Capacitor iOS** | Firebase popup ✓ * | Firebase popup ✓ * | WebAuthn ✓ | Firebase ✓ |
| **Capacitor Android** | Firebase popup ✓ * | No Apple | WebAuthn ✓ | Firebase ✓ |

> **\*** Native plugins like `@capacitor-firebase/authentication` are NOT recommended — they crash the Capacitor bridge on iOS 26 (see lessons). Use the Firebase Web SDK popup in the WebView instead. It works reliably.

## Files

| File | What |
|---|---|
| `backend/routes/firebase-auth.js` | Verify Firebase token, return your JWT |
| `backend/routes/passkeys.js` | WebAuthn passkey endpoints (passwordless) |
| `backend/middleware/verify-firebase.js` | Express middleware for Firebase Admin SDK verification |
| `backend/schema.sql` | All tables: users + passkeys |
| `frontend/hooks/useFirebase.jsx` | Firebase Auth hook (login, logout, user state) |
| `frontend/components/FirebaseLogin.jsx` | Login page with Google, Apple, Email/Password buttons |
| `frontend/components/FirebaseLogin.css` | Minimal styling |
| `frontend/components/PasskeyLogin.jsx` | Passkey sign-in + create account buttons |
| `frontend/components/PasskeyBanner.jsx` | Post-login "Set up Face ID" prompt |
| `frontend/components/PasskeySettings.jsx` | Add/remove passkeys in settings |
| `capacitor/setup.md` | Capacitor-specific notes |

## Setup

### 1. Firebase Project
Create a Firebase project (or reuse `geezeasy-69c5c`).

**Web app** → Firebase Console → Project Settings → General → "Add app" → Web.
Copy the `firebaseConfig` object with `apiKey`, `authDomain`, `projectId`, etc.

**Admin SDK** → Project Settings → Service Accounts → "Generate new private key".
Save to `~/Developer/private_keys/firebase-admin.json`.

### 2. Google Sign-In
Firebase Console → Authentication → Sign-in method → Enable Google.
Add your OAuth redirect URI to Google Cloud Console if needed.

### 3. Apple Sign-In
Firebase Console → Authentication → Sign-in method → Enable Apple.
Requires: Apple Developer account, Service ID, Domain verification.

### 4. Backend .env
```
FIREBASE_PROJECT_ID=geezeasy-69c5c
GOOGLE_APPLICATION_CREDENTIALS=~/Developer/private_keys/firebase-admin.json
JWT_SECRET=your-random-64-char-secret
```

### 5. Frontend .env
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=geezeasy-69c5c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=geezeasy-69c5c
VITE_FIREBASE_STORAGE_BUCKET=geezeasy-69c5c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 6. Install deps
```bash
cd backend && npm install firebase-admin jsonwebtoken @simplewebauthn/server bcryptjs
cd frontend && npm install firebase @simplewebauthn/browser
```

### 7. Wire it up
```js
// server.js
import firebaseAuthRoutes from './routes/firebase-auth.js';
import passkeyRoutes from './routes/passkeys.js';

app.use('/api', firebaseAuthRoutes);
app.use('/api', passkeyRoutes);  // must be before other /api routers with authMiddleware
```

## Firebase Token → Your JWT Flow

```
POST /api/auth/firebase
  Body: { idToken: "<firebase-id-token>" }

  Backend:
    1. admin.auth().verifyIdToken(idToken)  — verifies signature + project match
    2. Find or create user by firebase UID
    3. Sign your own JWT
    4. Return { token, user }

Frontend:
    const result = await signInWithPopup(auth, googleProvider)
    const idToken = await result.user.getIdToken(true)  // forceRefresh = true
    const { token } = await api.post('/api/auth/firebase', { idToken })
    localStorage.setItem('token', token)
```

## ⚠️ Critical Production Notes

### Popup blocked (`auth/popup-blocked`)
**Never `await` before `signInWithPopup()`** — any async gap kills the browser's user gesture.
- ✅ Eager init Firebase on page load, set a `ready` flag
- ✅ Call `signInWithPopup()` synchronously in the click handler (no `await` before it)
- ❌ `await ensureFirebase(); await signInWithPopup(...)` — WILL be blocked

### Token verification fails ("Invalid Firebase token")
Common causes:
1. **Sending Google access token instead of Firebase ID token** — use `result.user.getIdToken(true)`, NOT `credential.accessToken`
2. **Expired token** — always pass `true` to `getIdToken()` for force-refresh
3. **Missing `password_hash` column** — Firebase users have no password; insert empty string `''` 
4. **SQLite UNIQUE constraint in ALTER TABLE** — SQLite cannot do `ALTER TABLE ... ADD COLUMN ... UNIQUE`. Add column first, then `CREATE UNIQUE INDEX IF NOT EXISTS`

### Database migration for existing apps
```js
// In db.js, after CREATE TABLE:
try { db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT'); } catch (_) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)'); } catch (_) {}
// ⚠️ Do NOT put UNIQUE in the ALTER TABLE — SQLite doesn't support it
```

### Subdomain env vars (Hostinger)
Subdomains can't have separate hPanel environment variables. Put Firebase config in a `.env.prod` file deployed with the code:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# etc.
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...",...}
```

### Deploy checklist
- [ ] Root `package.json` has `dotenv`, `firebase-admin` (npm install runs from root on Hostinger)
- [ ] `.env.prod` deployed with Firebase config (subdomains can't use hPanel env vars)
- [ ] `firebase-key.json` deployed in backend/ (or `FIREBASE_SERVICE_ACCOUNT` env var set)
- [ ] Database has `firebase_uid` column (check with `PRAGMA table_info(users)`)
- [ ] Domain authorized in Firebase: Console → Auth → Settings → Authorized domains
- [ ] Apple Service ID has correct return URL in Apple Developer Portal
- [ ] Exclude `*.db` files from deploy archive (local DBs overwrite production)

## Mixed Auth (same account, multiple methods)

Users can sign up with Google and later add a passkey. Both methods link to the same user record.

```sql
users (
  id, firebase_uid, email, name, ...
)
passkeys (
  id, user_id, credential_id, ...
)
```

A user signed in via Google can go to Settings → "Add Passkey" to enable Face ID for future logins.
