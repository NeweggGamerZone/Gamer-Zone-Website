#!/usr/bin/env python3
"""Generate the SHA-256 hash for the admin page password.

Usage: python scripts/hash_password.py "YourNewPassword"
Paste the output into PASS_HASH in assets/js/admin.js.
"""
import hashlib
import sys

if len(sys.argv) != 2:
    print(__doc__)
    sys.exit(1)

print(hashlib.sha256(sys.argv[1].encode()).hexdigest())
