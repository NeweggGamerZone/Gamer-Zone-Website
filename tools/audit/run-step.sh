#!/usr/bin/env bash
# Runs exactly one step of the full QA suite, with its own local server
# lifecycle -- split out from run-full-qa.sh so each step can be invoked
# in its own bounded shell call. Usage: bash run-step.sh <contrast|width|console|screenshots>
set -e
cd "$(dirname "$0")"
AUDIT_DIR="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"
PORT="${PORT:-8821}"

if [ -d "$AUDIT_DIR/.deps/extracted" ]; then
  export LD_LIBRARY_PATH="$AUDIT_DIR/.deps/extracted/usr/lib/x86_64-linux-gnu:$AUDIT_DIR/.deps/extracted/lib/x86_64-linux-gnu"
fi

cd "$REPO_ROOT"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

for i in $(seq 1 20); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html"; then break; fi
  sleep 0.25
done

export BASE_URL="http://127.0.0.1:$PORT/"

case "$1" in
  contrast)
    node "$AUDIT_DIR/collect.js"
    python3 "$AUDIT_DIR/analyze.py"
    ;;
  width)
    node "$AUDIT_DIR/width-check.js"
    ;;
  console)
    node "$AUDIT_DIR/console-check.js"
    ;;
  screenshots)
    node "$AUDIT_DIR/screenshot-all.js"
    ;;
  *)
    echo "usage: run-step.sh <contrast|width|console|screenshots>" >&2
    exit 2
    ;;
esac
