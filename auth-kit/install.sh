#!/bin/bash
# Auth Kit Installer — one command to add Firebase + Passkey auth to any app
# Usage: bash ~/dev-tools/auth-kit/install.sh /path/to/your/app

set -e

APP_PATH="${1%/}"
if [ -z "$APP_PATH" ]; then
  echo "Usage: bash ~/dev-tools/auth-kit/install.sh /path/to/your/app"
  echo ""
  echo "This will install Firebase Auth + Passkey into your app."
  echo "Your app needs a 'backend/' and 'frontend/' folder."
  exit 1
fi

KIT="$HOME/dev-tools/auth-kit"

echo "┌────────────────────────────────────────────┐"
echo "│        Auth Kit Installer                  │"
echo "└────────────────────────────────────────────┘"
echo ""
echo "Installing into: $APP_PATH"
echo ""

# ─── Detect if backend exists ───
if [ -d "$APP_PATH/backend" ]; then
  echo "→ Installing backend routes..."
  cp "$KIT/backend/routes/firebase-auth.js" "$APP_PATH/backend/routes/"
  cp "$KIT/backend/routes/passkeys.js" "$APP_PATH/backend/routes/"
  echo "  ✓ firebase-auth.js"
  echo "  ✓ passkeys.js"
else
  echo "  ⚠ No backend/ folder found. Skipping backend."
fi

# ─── Detect if frontend exists ───
if [ -d "$APP_PATH/frontend/src" ]; then
  echo "→ Installing frontend components..."
  mkdir -p "$APP_PATH/frontend/src/components"
  mkdir -p "$APP_PATH/frontend/src/hooks"
  cp "$KIT/frontend/components/FirebaseLogin.jsx" "$APP_PATH/frontend/src/components/"
  cp "$KIT/frontend/components/PasskeyLogin.jsx" "$APP_PATH/frontend/src/components/"
  cp "$KIT/frontend/components/PasskeyBanner.jsx" "$APP_PATH/frontend/src/components/"
  cp "$KIT/frontend/components/PasskeySettings.jsx" "$APP_PATH/frontend/src/components/"
  cp "$KIT/frontend/hooks/useFirebase.jsx" "$APP_PATH/frontend/src/hooks/"
  echo "  ✓ FirebaseLogin.jsx"
  echo "  ✓ PasskeyLogin.jsx"
  echo "  ✓ PasskeyBanner.jsx"
  echo "  ✓ PasskeySettings.jsx"
  echo "  ✓ useFirebase.jsx"
  echo ""
  echo "  📋 Next: Add these imports to your Login.jsx:"
  echo "     import FirebaseLogin from './FirebaseLogin';"
  echo "     import { FirebaseProvider } from './hooks/useFirebase';"
  echo ""
  echo "  📋 Add this to your app wrapper in App.jsx:"
  echo "     <FirebaseProvider>"
  echo "       <YourRoutes />"
  echo "     </FirebaseProvider>"
else
  echo "  ⚠ No frontend/src/ folder found. Skipping frontend."
fi

# ─── Copy schema reference ───
cp "$KIT/backend/schema.sql" "$APP_PATH/"
echo "→ Schema reference copied: schema.sql"
echo ""

# ─── Instructions ───
echo "┌────────────────────────────────────────────┐"
echo "│  Post-Install Checklist                    │"
echo "└────────────────────────────────────────────┘"
echo ""
echo "1. Install backend deps:"
echo "   cd $APP_PATH/backend"
echo "   npm install firebase-admin @simplewebauthn/server jsonwebtoken bcryptjs"
echo ""
echo "2. Install frontend deps:"
echo "   cd $APP_PATH/frontend"
echo "   npm install firebase @simplewebauthn/browser"
echo ""
echo "3. Add Firebase config to your .env:"
echo "   VITE_FIREBASE_API_KEY=..."
echo "   VITE_FIREBASE_AUTH_DOMAIN=..."
echo "   VITE_FIREBASE_PROJECT_ID=..."
echo "   VITE_FIREBASE_STORAGE_BUCKET=..."
echo "   VITE_FIREBASE_MESSAGING_SENDER_ID=..."
echo "   VITE_FIREBASE_APP_ID=..."
echo ""
echo "4. Add this to your server.js:"
echo "   import firebaseRoutes from './routes/firebase-auth.js';"
echo "   import passkeyRoutes from './routes/passkeys.js';"
echo "   app.use('/api', firebaseRoutes);"
echo "   app.use('/api', passkeyRoutes);"
echo ""
echo "5. Add the users + passkeys tables to your DB schema"
echo "   (see schema.sql for reference)"
echo ""
echo "✅ Done!"
