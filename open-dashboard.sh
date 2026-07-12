#!/bin/bash
# Wait for dev-dashboard server to be ready, then open browser
for i in $(seq 1 20); do
  curl -s -o /dev/null http://localhost:1919/api/status && break
  sleep 1
done
open http://localhost:1919/dashboard.html
