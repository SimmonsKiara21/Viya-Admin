#!/usr/bin/env python3
"""Point roster ids at Square academy / enrollment student numbers."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# website id -> Square title / invoice student number (enrollment wins when both exist)
REMAP = {
    "0830": "0839",  # Abril Becerra — Square 00839 Modeling; 0830 is Ariel Gonzalez's sub invoice
    "0412": "0381",  # Megan Sherrard — Square 00381 Modeling
}


def remap_id(value: str, aliases: dict[str, str]) -> str:
    return aliases.get(value, value)


def main() -> None:
    seed = json.loads((ROOT / "data" / "seed.json").read_text())
    taken = {s["id"] for s in seed["students"]}
    aliases: dict[str, str] = {}
    for old, new in REMAP.items():
        if old not in taken:
            print(f"skip missing {old}")
            continue
        if new in taken and new != old:
            raise SystemExit(f"target {new} already on roster")
        aliases[old] = new

    for student in seed["students"]:
        if student["id"] in aliases:
            student["id"] = aliases[student["id"]]

    keep_keys = ("payments", "attendance", "feedback", "photoshootPlacements")
    for key in keep_keys:
        for row in seed.get(key) or []:
            if row.get("studentId") in aliases:
                row["studentId"] = aliases[row["studentId"]]

    for group in seed.get("groups") or []:
        group["studentIds"] = [remap_id(i, aliases) for i in group.get("studentIds") or []]

    (ROOT / "data" / "seed.json").write_text(json.dumps(seed, indent=2) + "\n")
    print(json.dumps({"remapped": aliases}, indent=2))


if __name__ == "__main__":
    main()
