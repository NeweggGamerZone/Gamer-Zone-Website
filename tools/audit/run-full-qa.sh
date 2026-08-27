#!/usr/bin/env bash
# Full scripted QA pass: contrast audit + container-width consistency +
# console/error smoke test + screenshot capture at every breakpoint, all
# in one server session. This covers everything in the loop that's
# genuinely deterministic/scriptable — see docs/QA-RUNBOOK.md for the
# manual-judgment steps this does NOT cover (persona walkthrough,
# soft-goals gut-check, interactive-feature playtesting), which is what
# turns a scripted pass into the full propose-then-approve QA loop Eric
# asked for. This script only ever reports findings; nothing here commits
# or modifies site files.
#
# First-time setup: bash tools/audit/setup.sh
# Then:             bash tools/audit/run-full-qa.sh
#
# Env vars (all optional): PORT (default 8821), PAGES, OUT_DIR.
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
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

for i in $(seq 1 20); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html"; then break; fi
  sleep 0.25
done

export BASE_URL="http://127.0.0.1:$PORT/"
FAIL=0

echo "===== 1/4 Contrast audit (WCAG AAA, pixel-verified) ====="
node "$AUDIT_DIR/collect.js"
python3 "$AUDIT_DIR/analyze.py" || FAIL=1
echo

echo "===== 2/4 Container-width consistency ====="
node "$AUDIT_DIR/width-check.js" || FAIL=1
echo

echo "===== 3/4 Console/error smoke test ====="
node "$AUDIT_DIR/console-check.js" || FAIL=1
echo

echo "===== 4/4 Screenshot capture (mobile/tablet/desktop x 5 pages) ====="
node "$AUDIT_DIR/screenshot-all.js"
echo

if [ "$FAIL" -eq 0 ]; then
  echo "All scripted checks passed. Now do the manual review steps in docs/QA-RUNBOOK.md (persona walkthrough against the screenshots just captured, soft-goals gut-check, interactive-feature playtesting) before reporting findings."
else
  echo "One or more scripted checks found real issues — see output above and the *.json files in tools/audit/out/. Report these as findings; do not fix them without review (see docs/QA-RUNBOOK.md)."
fi
exit $FAIL
