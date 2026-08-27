#!/usr/bin/env bash
# One-time environment setup for tools/audit/ — installs Puppeteer and, if
# headless Chrome can't launch because of missing shared libraries (common
# in a minimal/sandboxed container with no root access), downloads just
# those .deb packages with `apt-get download` (no root required — this
# only fetches, it doesn't install) and extracts them locally with
# dpkg-deb -x into tools/audit/.deps, then points LD_LIBRARY_PATH at them.
#
# Run once per fresh environment:
#   bash tools/audit/setup.sh
# Then, in the SAME shell (or after `source`-ing the printed export line),
# run.sh will work.
set -e
cd "$(dirname "$0")"

echo "== Installing Puppeteer =="
npm install puppeteer --silent

echo "== Checking whether headless Chrome can launch as-is =="
if node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] })
  .then(b => b.close())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" 2>/dev/null; then
  echo "Chrome launches fine with no extra setup. Nothing else to do."
  exit 0
fi

echo "== Chrome is missing shared libraries — fetching them locally (no root needed) =="
mkdir -p .deps/debs .deps/extracted
cd .deps/debs
# This list covers what headless Chrome/Chromium needs beyond a truly
# minimal base image; if setup.sh's launch check above still fails after
# this, run collect.js directly and read the exact "error while loading
# shared libraries: libFoo.so.N" message it prints, then
# `apt-get download libfoo1` and dpkg-deb -x it the same way.
apt-get download \
  libxdamage1 libxcomposite1 libxrandr2 libxfixes3 libxrender1 libxext6 \
  libxkbcommon0 libgbm1 libnss3 libnspr4 libdrm2 libxcb1 \
  libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  2>&1 | tail -20 || true
for f in *.deb; do
  [ -e "$f" ] && dpkg-deb -x "$f" ../extracted
done
cd ../..

LIBPATH="$(pwd)/.deps/extracted/usr/lib/x86_64-linux-gnu:$(pwd)/.deps/extracted/lib/x86_64-linux-gnu"
echo "== Verifying with LD_LIBRARY_PATH set =="
if LD_LIBRARY_PATH="$LIBPATH" node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] })
  .then(b => b.close())
  .then(() => process.exit(0))
  .catch(e => { console.error(e.message); process.exit(1); });
"; then
  echo "OK. Chrome launches with the local libs."
  echo
  echo "Before running collect.js in this or any future shell, export:"
  echo "  export LD_LIBRARY_PATH=\"$LIBPATH\""
else
  echo "Still failing — read the 'shared libraries' error above, apt-get download the named package, dpkg-deb -x it into .deps/extracted, and retry." >&2
  exit 1
fi
