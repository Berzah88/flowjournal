#!/usr/bin/env python3
"""Inspect a Firestore user doc (helper for debugging notifications).
Usage:
  python backend/inspect_user.py [user_id]
If no user_id is given, defaults to the id used by the app.
"""

import sys
import os

# Ensure project root is on sys.path so we can import package-style modules
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend import send_manual_test as m

uid = sys.argv[1] if len(sys.argv) > 1 else 'user_dJAXp5PIRZGaaijVHYBp'
try:
    doc = m.db.collection('users').document(uid).get()
    print('DOC_EXISTS:', doc.exists)
    if not doc.exists:
        sys.exit(0)
    d = doc.to_dict() or {}
    for k, v in d.items():
        if isinstance(v, str) and len(v) > 120:
            print(f"{k}: {v[:120]}... (len={len(v)})")
        else:
            print(f"{k}: {v}")
except Exception as e:
    print('ERROR:', e)
    sys.exit(2)
