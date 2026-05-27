---
description: Start app on browser + iOS simulator
agent: Atlas
---
Start the development server and open the app on BOTH the browser and iOS simulator at the same time.

Steps:
1. Detect the project type (Vite, Next, CRA, React Native, Flutter, Capacitor, etc.)
2. Get the Mac's local IP address: `ipconfig getifaddr en0`
3. Check if a dev server is already running on the expected port
4. Boot the iOS simulator if not already running: `xcrun simctl boot "iPhone 16" 2>/dev/null; open -a Simulator`
5. Start the dev server in the background

Then based on project type:

**Capacitor project** (has capacitor.config.ts):
- Start Vite dev server with host 0.0.0.0
- Run `npx cap run ios --external` for live reload on simulator
- Open `http://localhost:<port>` in the default browser: `open http://localhost:<port>`

**React Native / Expo**:
- Run `npx expo start`
- Run `npx expo start --ios` in background for simulator
- Open the Expo dev URL in browser

**Flutter**:
- Run `flutter run -d all` to target simulator + chrome

**Plain web (Vite/Next/CRA/etc.)**:
- Start the dev server with host 0.0.0.0
- Open `http://localhost:<port>` in the default browser: `open http://localhost:<port>`
- Open the same URL in the iOS simulator's Safari:
  `xcrun simctl openurl booted "http://<local-ip>:<port>"`

**Fullstack** (has both client/ and server/ with package.json scripts for dev):
- Run `npm run dev` (concurrently) or start both client and server
- Open the client URL in browser
- Open the client URL in simulator Safari

Always print the accessible URLs clearly:
- Local: http://localhost:<port>
- Network: http://<local-ip>:<port>

After everything is running, print:
"Browser: open | Simulator: open | Live reload: active"

If $ARGUMENTS is provided, use it as additional flags.
