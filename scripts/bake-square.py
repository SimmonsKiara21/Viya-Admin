#!/usr/bin/env python3
"""Bake a live Square invoice pull onto seed.json. Read-only — does not write to Square."""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TODAY = date.today().isoformat()
DROPPED_IDS = {"1103", "CK-01", "1104"}
DROPPED_NAMES = {"noah lerma", "sierra swider", "hector jimenez"}


def fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    text = text.lower().replace("'", "").replace(".", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    text = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", text)
    return re.sub(r"\s+", " ", text).strip()


def match_student(name: str, students: list[dict], student_id: str = "") -> dict | None:
    sid = (student_id or "").strip()
    if sid:
        padded = sid.zfill(4) if sid.isdigit() else sid
        hit = next((s for s in students if s.get("id") in {sid, padded, sid.lstrip("0")}), None)
        if hit:
            return hit
    needle = fold(name)
    if not needle:
        return None
    parts = needle.split()
    first = parts[0]
    last = parts[-1]
    rest = " ".join(parts[1:])
    exact, loose = [], []
    for st in students:
        full = fold(f"{st['firstName']} {st['lastName']}")
        nick = fold(f"{st.get('nickname') or ''} {st['lastName']}").strip()
        sf, sl = fold(st["firstName"]), fold(st["lastName"])
        if full == needle or (nick and nick == needle):
            exact.append(st)
            continue
        if sf == first and (sl == rest or sl == last or sl.endswith(last) or last in sl.split()):
            loose.append(st)
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


def money(value) -> float:
    if isinstance(value, (int, float)):
        return round(value) / 100 if abs(value) >= 1 else float(value)
    if isinstance(value, dict) and value.get("amount") is not None:
        return round(value["amount"]) / 100
    return 0.0


def guess_item(title: str) -> str:
    text = (title or "").lower()
    if "og" in text:
        return "va-subscription-og"
    if "subscription" in text:
        return "va-subscription"
    if "va102" in text:
        return "va102"
    if "cancellation" in text:
        return "cancellation"
    if "nov" in text:
        return "model-source-nov"
    if "payment plan" in text and "model source" in text:
        return "model-source-pp"
    if "model source" in text:
        return "model-source-pif"
    return "va101"


def request_status(invoice_status: str, due: str, paid: float, amount: float) -> str | None:
    key = (invoice_status or "").upper()
    if key in {"DRAFT", "CANCELED", "CANCELLED"}:
        return None
    if amount > 0 and paid >= amount:
        return "paid"
    if key == "FAILED":
        return "declined"
    if due and due <= TODAY:
        return "overdue"
    if due and due > TODAY:
        return "scheduled"
    return "due"


def map_invoices(raw: list, names: dict) -> list[dict]:
    rows = []
    for invoice in raw:
        recipient = invoice.get("primary_recipient") or {}
        cid = recipient.get("customer_id") or ""
        name = f"{recipient.get('given_name') or ''} {recipient.get('family_name') or ''}".strip() or names.get(cid) or ""
        number = str(invoice.get("invoice_number") or "").strip()
        title = invoice.get("title") or invoice.get("description") or ""
        if not name and not number:
            continue
        invoice_id = invoice.get("id") or number or ""
        item_id = guess_item(title)
        requests = invoice.get("payment_requests") or [None]
        for req in requests:
            req = req or {}
            amount = money(req.get("computed_amount_money")) or money(req.get("fixed_amount_requested_money")) or money(
                req.get("total_completed_amount_money")
            )
            paid = money(req.get("total_completed_amount_money"))
            due = req.get("due_date") or ""
            uid = req.get("uid") or due
            if not amount and not paid:
                continue
            status = request_status(invoice.get("status") or "", due, paid, amount)
            if not status:
                continue
            rows.append(
                {
                    "name": name or number,
                    "studentId": number,
                    "invoiceId": f"{invoice_id}:{uid}" if uid else invoice_id,
                    "itemId": item_id,
                    "amount": amount or paid,
                    "paid": paid,
                    "status": status,
                    "dueDate": due,
                }
            )
    return rows


def next_pay_id(payments: list[dict], n: int) -> tuple[str, int]:
    used = {p["id"] for p in payments}
    while True:
        candidate = f"pay-sq-{n:05d}"
        if candidate not in used:
            return candidate, n + 1
        n += 1


def is_academy(item_id: str, items: dict) -> bool:
    kind = (items.get(item_id) or {}).get("kind")
    return kind == "academy" or item_id in {"va101", "va102"}


def main() -> None:
    raw_path = Path("/tmp/square-raw.json")
    raw = json.loads(raw_path.read_text())
    seed = json.loads((ROOT / "data" / "seed.json").read_text())
    square = json.loads((ROOT / "data" / "square.json").read_text())
    items = {item["id"]: item for item in square["items"]}
    students = [
        student
        for student in seed["students"]
        if student.get("id") not in DROPPED_IDS and fold(f"{student.get('firstName','')} {student.get('lastName','')}") not in DROPPED_NAMES
    ]
    payments = [payment for payment in seed["payments"] if payment.get("studentId") not in DROPPED_IDS]
    mapped = map_invoices(raw.get("invoices") or [], raw.get("names") or {})
    canceled_ids = {
        invoice.get("id")
        for invoice in raw.get("invoices") or []
        if (invoice.get("status") or "").upper() in {"CANCELED", "CANCELLED"} and invoice.get("id")
    }

    incoming_by_student: dict[str, set[str]] = {}
    roster_rows = []
    skipped_names = []
    seen_skip = set()
    matched_students = set()
    pay_n = 1

    for row in mapped:
        student = match_student(row["name"], students, row.get("studentId") or "")
        if not student:
            if row["name"] not in seen_skip:
                seen_skip.add(row["name"])
                skipped_names.append({"name": row["name"], "reason": "On Square, not on the website roster"})
            continue
        matched_students.add(student["id"])
        incoming_by_student.setdefault(student["id"], set()).add(row["invoiceId"])
        roster_rows.append(row)
        item = items.get(row["itemId"]) or items["va101"]
        rec = next(
            (p for p in payments if p["studentId"] == student["id"] and p.get("squareInvoiceId") == row["invoiceId"]),
            None,
        )
        if rec is None:
            rec_id, pay_n = next_pay_id(payments, pay_n)
            rec = {"id": rec_id, "studentId": student["id"]}
            payments.append(rec)
        amount = float(row["amount"] or 0)
        paid = float(row["paid"] or 0)
        rec.update(
            {
                "amount": amount,
                "paidAmount": paid,
                "balance": round(max(amount - paid, 0), 2),
                "dueDate": row["dueDate"],
                "paidDate": row["dueDate"] if row["status"] == "paid" else "",
                "status": row["status"],
                "method": "square",
                "squareInvoiceId": row["invoiceId"],
                "notes": "",
                "itemId": item["id"],
                "itemName": item["name"],
                "itemDescription": "",
                "itemKind": item.get("kind") or "academy",
                "source": "square",
            }
        )

    payments = [
        p
        for p in payments
        if p.get("studentId") not in DROPPED_IDS
        and not any(str(p.get("squareInvoiceId") or "").startswith(f"{cid}:") or p.get("squareInvoiceId") == cid for cid in canceled_ids)
        and (
            p.get("source") != "square"
            or p["studentId"] not in matched_students
            or p.get("squareInvoiceId") in incoming_by_student.get(p["studentId"], set())
        )
    ]

    open_status = {"due", "overdue", "declined", "scheduled"}
    for student in students:
        if student["id"] not in matched_students:
            continue
        rows = [p for p in payments if p["studentId"] == student["id"] and p.get("source") == "square"]
        open_rows = sorted(
            [p for p in rows if p.get("status") in open_status],
            key=lambda p: p.get("dueDate") or "",
        )
        if open_rows:
            nxt = open_rows[0]
            student["nextPaymentDate"] = nxt.get("dueDate") or ""
            student["nextPaymentAmount"] = nxt.get("balance") or nxt.get("amount")
        else:
            student["nextPaymentDate"] = ""
            student["nextPaymentAmount"] = None
        academy_open = [
            p
            for p in open_rows
            if is_academy(p.get("itemId") or "", items)
        ]
        if student.get("paymentPlan") == "pp" and not (student.get("deskLocks") or {}).get("installments"):
            if academy_open:
                student["installmentsLeft"] = len(academy_open)
            elif any(is_academy(p.get("itemId") or "", items) for p in rows):
                student["installmentsLeft"] = 0

    seed["students"] = students
    seed["payments"] = payments
    square["invoices"] = roster_rows
    square["skipped"] = skipped_names
    square["syncedAt"] = TODAY
    square["source"] = "Square API"
    square["locationNote"] = "LC790E49DZ6B9"

    (ROOT / "data" / "seed.json").write_text(json.dumps(seed, indent=2) + "\n")
    (ROOT / "data" / "square.json").write_text(json.dumps(square, indent=2) + "\n")

    christian = [r for r in roster_rows if fold(r["name"]) == "christian barr"]
    print(
        json.dumps(
            {
                "mapped": len(mapped),
                "rosterRows": len(roster_rows),
                "openRoster": sum(1 for r in roster_rows if r["status"] != "paid"),
                "matchedStudents": len(matched_students),
                "skippedPeople": len(skipped_names),
                "seedPayments": len(payments),
                "droppedIds": sorted(DROPPED_IDS),
                "canceledInvoices": len(canceled_ids),
                "christian": [f"{r['dueDate']} {r['status']} {r['amount']}" for r in christian],
                "liam": [f"{r['dueDate']} {r['status']} {r['amount']}" for r in roster_rows if r.get("studentId") in {"1017", "017"}],
                "hectorLeft": any(s.get("id") == "1104" for s in students),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
