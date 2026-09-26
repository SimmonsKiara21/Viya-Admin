#!/usr/bin/env python3
"""Copy the newest live desk drop onto data/desk-shared.json."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

DROP_ID = "6aa479dd-faa8-4a7e-8449-956c1d610b89"
PASSWORD = "viyatalent"
OUT = Path("data/desk-shared.json")


def main() -> int:
    url = f"https://webhook.site/token/{DROP_ID}/requests?sorting=newest&per_page=8"
    with urllib.request.urlopen(url, timeout=30) as res:
        payload = json.load(res)
    latest = None
    for row in payload.get("data") or []:
        try:
            content = json.loads(row.get("content") or "")
        except json.JSONDecodeError:
            continue
        if content.get("password") not in (None, PASSWORD):
            continue
        if content.get("source") != "staff" or content.get("encoding") != "gzip-base64":
            continue
        if not content.get("blob"):
            continue
        latest = {
            "source": "staff",
            "savedAt": content.get("savedAt") or "",
            "build": content.get("build") or "",
            "encoding": "gzip-base64",
            "data": None,
            "blob": content["blob"],
        }
        break
    if not latest:
        print("no live desk drop")
        return 0
    current = {}
    if OUT.exists():
        try:
            current = json.loads(OUT.read_text())
        except json.JSONDecodeError:
            current = {}
    if current.get("savedAt") == latest["savedAt"] and current.get("blob") == latest["blob"]:
        print("desk already current")
        return 0
    OUT.write_text(json.dumps(latest, separators=(",", ":")))
    print(f"wrote desk {latest['savedAt']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
