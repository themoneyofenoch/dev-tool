#!/bin/bash
# Ammaniel Command Center — one-click launcher
# Double-click this file to start dashboard + dictation

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=1919
DICTATE_PY="/Users/nakfaai/scripts/dictation-server.py"
DICTATE_ENV="/Users/nakfaai/scripts/dictate-env/bin/python3"

# Kill any existing servers
pkill -f "dev-dashboard/index.js" 2>/dev/null
pkill -f "dictation-server.py" 2>/dev/null
sleep 1

# ── Start Dashboard (port 1919) ──
cd "$DIR"
nohup node dev-dashboard/index.js > /tmp/dashboard.log 2>&1 &

# ── Start Dictation (port 1920) ──
# Auto-restarts if it crashes — while loop
nohup bash -c 'while true; do '"$DICTATE_ENV $DICTATE_PY"' >> /tmp/dictation.log 2>&1; sleep 2; done' > /dev/null 2>&1 &

sleep 2

# Open browser
open "http://localhost:$PORT/dashboard.html"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ammaniel Command Center"
echo "  http://localhost:$PORT/dashboard.html"
echo "  🎤 Dictation server on ws://localhost:1920"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
