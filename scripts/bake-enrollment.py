#!/usr/bin/env python3
"""Final enrollment workbook bake. Does not write to Square."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TODAY = date.today().isoformat()
CURRENT_HEADERS = [
    "STUDENT ID",
    "PAYMENT PLAN",
    "STATUS",
    "NAME",
    "",
    "",
    "PAYMNETS LEFT",
    "AGE",
    "NUMBER",
    "EMAIL",
    "START DATE",
    "NOTES",
]


def fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    text = text.lower().replace("'", "").replace(".", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    text = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", text)
    return re.sub(r"\s+", " ", text).strip()


def match_student(name: str, students: list[dict], student_id: str = "") -> dict | None:
    if student_id:
        hit = next((s for s in students if s.get("id") == student_id), None)
        if hit:
            return hit
    needle = fold(name)
    if not needle:
        return None
    parts = needle.split()
    first = parts[0]
    last = parts[-1]
    rest = " ".join(parts[1:])
    swapped = fold(f"{last} {first}") if len(parts) == 2 else ""
    exact, loose = [], []
    for st in students:
        full = fold(f"{st['firstName']} {st['lastName']}")
        nick = fold(f"{st.get('nickname') or ''} {st['lastName']}").strip()
        sf, sl = fold(st["firstName"]), fold(st["lastName"])
        if full == needle or full == swapped or (nick and nick in {needle, swapped}):
            exact.append(st)
            continue
        if sf == first and (sl == rest or sl == last or sl.endswith(last) or last in sl.split()):
            loose.append(st)
        elif swapped and sf == last and sl == first:
            exact.append(st)
    if len(exact) == 1:
        return exact[0]
    if exact:
        return exact[0]
    if len(loose) == 1:
        return loose[0]
    if len(loose) > 1:
        tighter = [st for st in loose if fold(st["lastName"]) == rest]
        if len(tighter) == 1:
            return tighter[0]
    return None


def split_name(value: str) -> tuple[str, str, str]:
    nickname = ""
    cleaned = re.sub(r"\s*\((male|female)\)\s*", " ", value or "", flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    nick = re.search(r"\(([^)]+)\)", cleaned)
    if nick:
        nickname = title_name(nick.group(1).strip())
        cleaned = re.sub(r"\s+", " ", cleaned.replace(nick.group(0), " ")).strip()
    if "," in cleaned:
        last, *rest = [part.strip() for part in cleaned.split(",") if part.strip()]
        return title_name(" ".join(rest)), title_name(last), nickname
    parts = cleaned.split()
    if not parts:
        return "", "", nickname
    if len(parts) == 1:
        return title_name(parts[0]), "", nickname
    return title_name(" ".join(parts[:-1])), title_name(parts[-1]), nickname


def title_name(value: str) -> str:
    return " ".join(
        part[:1].upper() + part[1:].lower() if part == part.upper() or part == part.lower() else part
        for part in value.split()
    )


def normalize_date(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}", raw):
        return raw[:10]
    dashed = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$", raw)
    if dashed:
        month, day, year = dashed.groups()
        if len(year) == 2:
            year = f"20{year}"
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    month_day = re.match(r"^(\d{1,2})[/-](\d{1,2})$", raw)
    if month_day:
        return f"2026-{month_day.group(1).zfill(2)}-{month_day.group(2).zfill(2)}"
    return ""


def map_plan(value: str) -> str | None:
    key = (value or "").strip().lower()
    if not key:
        return None
    if "sub" in key:
        return "subscription"
    if "pif" in key or "paid in full" in key or key == "paid":
        return "pif"
    if "pp" in key or "plan" in key or "install" in key:
        return "pp"
    return None


def map_status(value: str) -> str | None:
    key = (value or "").strip().lower()
    if not key:
        return None
    if "overdue" in key or "declin" in key:
        return "overdue"
    if "pending" in key:
        return "pending"
    if "pause" in key:
        return "paused"
    if "cancel" in key:
        return "cancelling"
    if "collection" in key:
        return "collections"
    if "pif" in key or "paid in full" in key:
        return "pif"
    if "current" in key or key == "active":
        return "current"
    return None


def map_subscription_status(value: str) -> str | None:
    key = (value or "").strip().lower()
    if not key:
        return None
    if re.search(r"add when|when done|interest|wait", key):
        return "interested"
    if "pause" in key:
        return "paused"
    if "cancel" in key:
        return "cancelled"
    if "active" in key:
        return "active"
    return None


def parse_due_from_notes(notes: str) -> tuple[str, float | None]:
    matches = [
        (m.group(1), normalize_date(m.group(2)))
        for m in re.finditer(
            r"\$?\s*(\d+(?:\.\d{1,2})?)\s+(?:due(?:\s+on)?)\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)",
            notes or "",
            flags=re.I,
        )
    ]
    parsed = [(amt, due) for amt, due in matches if due]
    if parsed:
        parsed.sort(key=lambda row: row[1])
        upcoming = next((row for row in parsed if row[1] >= TODAY), parsed[-1])
        return upcoming[1], float(upcoming[0])
    only = re.match(r"^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)$", (notes or "").strip())
    if only:
        return normalize_date(only.group(1)), None
    return "", None


def read_csv(path: Path) -> list[list[str]]:
    text = path.read_text(encoding="utf-8-sig")
    rows = list(csv.reader(text.splitlines()))
    return [[cell.strip() for cell in row] for row in rows if any(cell.strip() for cell in row)]


def parse_academy_rows(rows: list[list[str]], defaults: dict) -> list[dict]:
    if not rows:
        return []
    header = [h.lower() for h in rows[0]]
    body = rows[1:]
    if header and re.match(r"^\d+$", header[0] or ""):
        header = [h.lower() for h in CURRENT_HEADERS]
        body = rows

    def idx(*names: str) -> int:
        for name in names:
            if name in header:
                return header.index(name)
        return -1

    id_i = idx("student id", "id")
    plan_i = idx("payment plan", "plan")
    status_i = idx("status", "enrollment")
    name_i = idx("name", "student name", "full name", "customer name")
    left_i = idx("payments left", "paymnets left", "remaining payments")
    age_i = idx("age")
    phone_i = idx("number", "phone", "phone number")
    email_i = idx("email")
    start_i = idx("start date", "start")
    notes_i = idx("notes", "note")
    class_i = idx("class time", "class")
    parsed = []
    for cols in body:
        def col(i: int) -> str:
            return cols[i] if i >= 0 and i < len(cols) else ""

        first, last, nick = split_name(col(name_i))
        if not first and not last:
            continue
        notes = col(notes_i)
        due, amount = parse_due_from_notes(notes)
        left_raw = col(left_i)
        age_raw = col(age_i)
        status = map_status(col(status_i)) or defaults.get("enrollmentStatus")
        plan = map_plan(col(plan_i)) or defaults.get("paymentPlan")
        if plan == "pif" and status == "current":
            status = "pif"
        parsed.append(
            {
                "id": col(id_i),
                "firstName": first,
                "lastName": last,
                "nickname": nick,
                "email": col(email_i),
                "phone": col(phone_i),
                "age": int(age_raw) if re.fullmatch(r"\d{1,2}", age_raw) else None,
                "paymentPlan": plan,
                "enrollmentStatus": status,
                "startDate": normalize_date(col(start_i)),
                "notes": notes,
                "installmentsLeft": int(left_raw) if re.fullmatch(r"\d+", left_raw) else None,
                "classTime": col(class_i),
                "nextPaymentDate": due,
                "nextPaymentAmount": amount,
                "program": defaults.get("program", "academy"),
                "subscriptionStatus": map_subscription_status(col(status_i)) or defaults.get("subscriptionStatus"),
            }
        )
    return parsed


def parse_subscription_rows(rows: list[list[str]]) -> list[dict]:
    if not rows:
        return []
    header = [h.lower() for h in rows[0]]

    def idx(*names: str) -> int:
        for name in names:
            if name in header:
                return header.index(name)
        return -1

    name_i = idx("customer name", "name")
    email_i = idx("customer email", "email")
    phone_i = idx("customer phone", "phone")
    status_i = idx("status")
    notes_i = idx("notes", "note")
    parsed = []
    for cols in rows[1:]:
        def col(i: int) -> str:
            return cols[i] if i >= 0 and i < len(cols) else ""

        first, last, nick = split_name(col(name_i))
        if not first and not last:
            continue
        notes = col(notes_i)
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", notes):
            notes = f"{notes[5:7]}/{notes[8:10]}"
        parsed.append(
            {
                "id": "",
                "firstName": first,
                "lastName": last,
                "nickname": nick,
                "email": col(email_i),
                "phone": col(phone_i),
                "notes": notes,
                "enrollmentStatus": map_status(col(status_i)) or "current",
                "subscriptionStatus": map_subscription_status(col(status_i)) or "active",
                "program": "subscriber",
                "paymentPlan": "subscription",
                "nextPaymentDate": normalize_date(notes) if notes else "",
            }
        )
    return parsed


def new_student(row: dict) -> dict:
    first = row["firstName"]
    last = row["lastName"]
    slug = fold(f"{first} {last}").replace(" ", "") or "student"
    return {
        "id": (row.get("id") or "").strip() or f"ENR{slug[:10]}",
        "firstName": first,
        "lastName": last,
        "nickname": row.get("nickname") or "",
        "email": row.get("email") or "",
        "phone": row.get("phone") or "",
        "age": row.get("age"),
        "program": row.get("program") or "academy",
        "track": "none" if row.get("program") == "subscriber" else "academy",
        "paymentPlan": row.get("paymentPlan") or "pp",
        "enrollmentStatus": row.get("enrollmentStatus") or "pending",
        "startDate": row.get("startDate") or "",
        "nextPaymentDate": row.get("nextPaymentDate") or "",
        "nextPaymentAmount": row.get("nextPaymentAmount"),
        "installmentsLeft": row.get("installmentsLeft"),
        "notes": row.get("notes") or "",
        "contactCategory": "",
        "subscriptionStatus": row.get("subscriptionStatus") or "none",
        "photoshootStatus": "none",
        "labels": ["Current Student"] if row.get("program") != "subscriber" else ["Active Subscribers"],
        "removedLabels": [],
        "deskLocks": {},
        "photoshootNotes": "",
        "classTime": row.get("classTime") or "",
        "photoUrl": "",
        "docusignStatus": "none",
        "docusignUrl": "",
        "docusignEnvelopeId": "",
        "docusignDocument": "",
        "docusignSentAt": "",
        "docusignSignedAt": "",
        "docusignNotes": "",
    }


def apply_workbook(students: list[dict], payments: list[dict], rows: list[dict], *, preserve_academy: bool = False) -> tuple[int, int]:
    has_square = {p["studentId"] for p in payments if p.get("source") == "square"}
    added = updated = 0
    for row in rows:
        existing = match_student(f"{row.get('firstName','')} {row.get('lastName','')}", students, row.get("id") or "")
        if not existing:
            students.insert(0, new_student(row))
            added += 1
            continue
        if preserve_academy and existing.get("program") == "academy":
            changed = False
            for field in ("email", "phone", "notes", "subscriptionStatus"):
                value = row.get(field)
                if not value:
                    continue
                if field == "notes" and existing.get("notes") and value != existing.get("notes"):
                    if value not in (existing.get("notes") or ""):
                        existing["notes"] = f"{existing['notes']}\n{value}".strip() if existing.get("notes") else value
                        changed = True
                    continue
                if existing.get(field) != value:
                    existing[field] = value
                    changed = True
            if changed:
                updated += 1
            continue
        changed = False
        for field in (
            "email",
            "phone",
            "age",
            "paymentPlan",
            "enrollmentStatus",
            "startDate",
            "notes",
            "classTime",
            "subscriptionStatus",
        ):
            value = row.get(field)
            if value in (None, ""):
                continue
            if existing.get(field) != value:
                existing[field] = value
                changed = True
        if existing.get("id") not in has_square:
            for field in ("nextPaymentDate", "nextPaymentAmount", "installmentsLeft"):
                value = row.get(field)
                if value in (None, ""):
                    continue
                if existing.get(field) != value:
                    existing[field] = value
                    changed = True
        elif row.get("installmentsLeft") is not None and not (existing.get("deskLocks") or {}).get("installments"):
            pass
        if changed:
            updated += 1
    return added, updated


def is_academy_item(item_id: str, item_kind: str) -> bool:
    return item_kind == "academy" or item_id in {"va101", "va102"}


def mark_overdue(students: list[dict], payments: list[dict]) -> int:
    flipped = 0
    by_student: dict[str, list[dict]] = {}
    for payment in payments:
        if payment.get("status") == "paid" or payment.get("source") == "workbook":
            continue
        due = (payment.get("dueDate") or "")[:10]
        if due and due <= TODAY:
            if payment.get("status") not in {"overdue", "declined"}:
                payment["status"] = "overdue"
            by_student.setdefault(payment["studentId"], []).append(payment)
    protected = {"collections", "cancelling", "paused", "contact"}
    for student in students:
        if student.get("program") == "prospect" or student.get("enrollmentStatus") == "contact":
            continue
        if student.get("enrollmentStatus") in protected:
            continue
        rows = by_student.get(student["id"]) or []
        if not rows:
            continue
        subscriber = student.get("program") == "subscriber" or student.get("paymentPlan") == "subscription"
        if subscriber:
            if student.get("enrollmentStatus") != "overdue":
                student["enrollmentStatus"] = "overdue"
                flipped += 1
            continue
        if student.get("paymentPlan") == "pif" or student.get("enrollmentStatus") == "pif":
            continue
        if any(is_academy_item(p.get("itemId") or "", p.get("itemKind") or "") or p.get("source") == "manual" for p in rows):
            if student.get("enrollmentStatus") != "overdue":
                student["enrollmentStatus"] = "overdue"
                flipped += 1
    return flipped


def main() -> None:
    src = Path("/tmp/enrollment-final")
    seed = json.loads((ROOT / "data" / "seed.json").read_text())
    students = seed["students"]
    payments = seed["payments"]

    current_rows = parse_academy_rows(read_csv(src / "CURRENT.csv"), {"program": "academy"})
    pending_rows = parse_academy_rows(read_csv(src / "PENDING.csv"), {"program": "academy", "enrollmentStatus": "pending"})
    collection_rows = parse_academy_rows(read_csv(src / "COLLECTIONS.csv"), {"program": "academy"})
    sub_rows = parse_subscription_rows(read_csv(src / "SUBSCRIPTIONS.csv"))

    added = updated = 0
    for rows, preserve in (
        (current_rows, False),
        (pending_rows, False),
        (sub_rows, True),
        (collection_rows, False),
    ):
        a, u = apply_workbook(students, payments, rows, preserve_academy=preserve)
        added += a
        updated += u

    flipped = mark_overdue(students, payments)
    seed["students"] = students
    seed["payments"] = payments
    (ROOT / "data" / "seed.json").write_text(json.dumps(seed, indent=2) + "\n")

    dest = ROOT / "data"
    (dest / "enrollment-current.csv").write_text((src / "CURRENT.csv").read_text(encoding="utf-8-sig"), encoding="utf-8")
    (dest / "enrollment-subscriptions.csv").write_text((src / "SUBSCRIPTIONS.csv").read_text(encoding="utf-8-sig"), encoding="utf-8")
    (dest / "enrollment-collections.csv").write_text((src / "COLLECTIONS.csv").read_text(encoding="utf-8-sig"), encoding="utf-8")
    (dest / "enrollment-pending.csv").write_text((src / "PENDING.csv").read_text(encoding="utf-8-sig"), encoding="utf-8")

    watch = [
        "0938",
        "1007",
        "1078",
        "0917",
        "0924",
        "1104",
        "1167",
        "1173",
        "1101",
        "1106",
        "1102",
        "0625",
    ]
    by_id = {s["id"]: s for s in students}
    print(
        json.dumps(
            {
                "today": TODAY,
                "added": added,
                "updated": updated,
                "flippedOverdue": flipped,
                "students": len(students),
                "currentRows": len(current_rows),
                "pendingRows": len(pending_rows),
                "collectionRows": len(collection_rows),
                "subscriptionRows": len(sub_rows),
                "watch": {
                    i: {
                        "name": f"{by_id[i]['firstName']} {by_id[i]['lastName']}",
                        "status": by_id[i]["enrollmentStatus"],
                        "notes": (by_id[i].get("notes") or "")[:120],
                        "next": by_id[i].get("nextPaymentDate"),
                    }
                    for i in watch
                    if i in by_id
                },
                "igrid": next(({"id": s["id"], "name": f"{s['firstName']} {s['lastName']}", "status": s["enrollmentStatus"], "notes": s.get("notes")} for s in students if fold(s["lastName"]) == "vega"), None),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
