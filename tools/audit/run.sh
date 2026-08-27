#!/usr/bin/env bash
# Runs the full pixel-verified contrast audit end to end: serves the repo
# root over HTTP, runs collect.js (Puppeteer walk + screenshots) then
# analyze.py (pixel sampling + WCAG math), and tears the server down again.
#
# This does the whole thing in ONE process tree on purpose — a background
# `python3 -m http.server &` started in a separate shell invocation from
# the one that runs collect.js will already be dead by the time collect.js
# tries to connect, in most sandboxed/ephemeral shell tools. Keeping the
# server + the scripts that depend on it in one script avoids that.
#
# First-time setup: bash tools/audit/setup.sh
# Then:             bash tools/audit/run.sh
#
# Env vars (all optional): PORT (default 8821), PAGES (default: the 5 real
# pages, see collect.js), OUT_DIR (default tools/audit/out).
set -e
cd "$(dirname "$0")"
AUDIT_DIR="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"
PORT="${PORT:-8821}"

if [ -d "$AUDIT_DIR/.deps/extracted" ]; then
  export LD_LIBRARY_PATH="$AUDIT_DIR/.deps/extracted/usr/lib/x86_64-linux-gnu:$AUDIT_DIR/.deps/extracted/lib/x86_64-linux-gnu"
fi
if [ ! -d "$AUDIT_DIR/node_modules/puppeteer" ]; then
  echo "Puppeteer isn't installed yet — run: bash tools/audit/setup.sh" >&2
  exit 1
fi

cd "$REPO_ROOT"
python3 -m http.server "$PORT" --bind 127.0.0.1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

# Wait for the server to actually accept connections instead of a fixed sleep.
for i in $(seq 1 20); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html"; then break; fi
  sleep 0.25
done

BASE_URL="http://127.0.0.1:$PORT/" node "$AUDIT_DIR/collect.js"
python3 "$AUDIT_DIR/analyze.py"
