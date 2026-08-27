#!/usr/bin/env python3
"""Overlay Square catalog + invoices onto enrollment-only seed payments.

People who appear in Square but not the 2026 enrollment workbook are skipped.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "data" / "seed.json"
SQUARE = ROOT / "data" / "square.json"


def fold(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    text = text.lower().replace("'", "").replace(".", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def match_student(name: str, students: list[dict]) -> dict | None:
    needle = fold(name)
    if not needle:
        return None
    parts = needle.split()
    first = parts[0]
    last = parts[-1]
    rest = " ".join(parts[1:])

    exact = []
    loose = []
    for st in students:
        full = fold(f"{st['firstName']} {st['lastName']}")
        nick_full = fold(f"{st.get('nickname') or ''} {st['lastName']}").strip()
        sf, sl = fold(st["firstName"]), fold(st["lastName"])
        if full == needle or (nick_full and nick_full == needle):
            exact.append(st)
            continue
        if sf == first and (sl == rest or sl == last or sl.endswith(last) or last in sl.split()):
            loose.append(st)
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        return exact[0]
    if len(loose) == 1:
        return loose[0]
    if len(loose) > 1:
        tighter = [st for st in loose if fold(st["lastName"]) == rest]
        if len(tighter) == 1:
            return tighter[0]
    return None


def default_item(student: dict, items: dict[str, dict]) -> dict:
    if student.get("program") == "subscriber" or student.get("paymentPlan") == "subscription":
        return items["va-subscription"]
    return items["va101"]


def apply_item(rec: dict, item: dict) -> None:
    rec["itemId"] = item["id"]
    rec["itemName"] = item["name"]
    rec["itemDescription"] = item.get("description") or ""
    rec["itemKind"] = item.get("kind") or "academy"


def with_balances(rec: dict) -> dict:
    amount = float(rec.get("amount") or 0)
    if rec.get("paidAmount") is None:
        rec["paidAmount"] = amount if rec.get("status") == "paid" else 0
    if rec.get("balance") is None:
        paid = float(rec.get("paidAmount") or 0)
        rec["balance"] = 0 if rec.get("status") == "paid" else round(max(amount - paid, 0), 2)
    return rec


def next_pay_id(payments: list[dict]) -> str:
    n = 1
    used = {p["id"] for p in payments}
    while True:
        candidate = f"pay-{n:04d}"
        if candidate not in used:
            return candidate
        n += 1


def open_payment_for(payments: list[dict], student_id: str, item_id: str | None = None) -> dict | None:
    open_status = {"due", "overdue", "declined", "scheduled"}
    matches = [
        p
        for p in payments
        if p["studentId"] == student_id and p.get("status") in open_status
    ]
    if item_id:
        same = [p for p in matches if p.get("itemId") == item_id]
        if same:
            matches = same
    if not matches:
        return None
    return sorted(matches, key=lambda p: p.get("dueDate") or "", reverse=True)[0]


def paid_payment_for(payments: list[dict], student_id: str, item_id: str | None = None) -> dict | None:
    matches = [p for p in payments if p["studentId"] == student_id and p.get("status") == "paid"]
    if item_id:
        same = [p for p in matches if p.get("itemId") == item_id]
        if same:
            matches = same
    if not matches:
        return None
    return sorted(matches, key=lambda p: p.get("dueDate") or "", reverse=True)[0]


def overlay_invoice(payments: list[dict], student: dict, inv: dict, item: dict) -> None:
    amount = float(inv.get("amount") or 0)
    paid = float(inv.get("paid") or 0)
    status = inv.get("status") or "due"
    rec = None
    for existing in payments:
        if existing["studentId"] == student["id"] and existing.get("squareInvoiceId") == str(inv["invoiceId"]):
            rec = existing
            break
    if rec is None:
        rec = open_payment_for(payments, student["id"], item["id"]) if status != "paid" else None
    if rec is None and status == "paid":
        rec = paid_payment_for(payments, student["id"], item["id"])
    if rec is None and status != "paid":
        rec = open_payment_for(payments, student["id"])
    if rec is None:
        rec = {
            "id": next_pay_id(payments),
            "studentId": student["id"],
            "method": "square",
            "notes": "",
        }
        payments.append(rec)
    rec.update(
        {
            "amount": amount,
            "paidAmount": paid,
            "balance": round(max(amount - paid, 0), 2),
            "dueDate": inv.get("dueDate") or rec.get("dueDate") or "",
            "paidDate": inv.get("dueDate") if status == "paid" else rec.get("paidDate") or "",
            "status": status,
            "method": "square",
            "squareInvoiceId": str(inv["invoiceId"]),
            "notes": f"Square invoice {inv['invoiceId']} · {item['name']}",
        }
    )
    apply_item(rec, item)

    remaining = round(max(amount - paid, 0), 2)
    if status in ("due", "overdue", "declined"):
        student["nextPaymentAmount"] = remaining or amount
        student["nextPaymentDate"] = inv.get("dueDate") or student.get("nextPaymentDate") or ""
        if status == "overdue" and student.get("enrollmentStatus") == "current":
            student["enrollmentStatus"] = "overdue"


def overlay_subscription(payments: list[dict], student: dict, sub: dict, item: dict) -> None:
    amount = float(sub.get("amount") or item.get("price") or 0)
    sub_status = sub.get("status") or "active"
    pay_status = "paid" if sub_status == "cancelled" else "due"
    if sub_status == "cancelling":
        pay_status = "scheduled"
    rec = None
    for existing in payments:
        if existing["studentId"] == student["id"] and existing.get("itemId") == item["id"]:
            rec = existing
            break
    if rec is None:
        rec = open_payment_for(payments, student["id"], item["id"])
    if rec is None:
        rec = {
            "id": next_pay_id(payments),
            "studentId": student["id"],
            "method": "square",
            "notes": "",
        }
        payments.append(rec)
    paid = amount if pay_status == "paid" else 0
    rec.update(
        {
            "amount": amount,
            "paidAmount": paid,
            "balance": 0 if pay_status == "paid" else amount,
            "dueDate": sub.get("cancelOn") or sub.get("lastPaid") or rec.get("dueDate") or "2026-09-01",
            "paidDate": sub.get("lastPaid") or "",
            "status": pay_status,
            "method": "square",
            "squareInvoiceId": rec.get("squareInvoiceId") or f"sqsub_{student['id']}",
            "notes": f"Square subscription · {item['name']}"
            + (f" · cancels {sub['cancelOn']}" if sub.get("cancelOn") else ""),
        }
    )
    apply_item(rec, item)
    student["program"] = student.get("program") or "subscriber"
    if sub_status == "cancelled":
        student["subscriptionStatus"] = "cancelled"
    elif sub_status == "cancelling":
        student["subscriptionStatus"] = "paused"
        student["notes"] = (
            f"{student.get('notes') + ' ' if student.get('notes') else ''}"
            f"Square subscription cancelling {sub.get('cancelOn', '')}.".strip()
        )
    else:
        student["subscriptionStatus"] = "active"
        student["nextPaymentAmount"] = amount
        if not student.get("nextPaymentDate"):
            student["nextPaymentDate"] = "2026-09-01"


def merge_into(seed: dict, square: dict) -> dict:
    items = {item["id"]: item for item in square["items"]}
    students = seed["students"]
    payments = seed["payments"]

    for rec in payments:
        student = next((s for s in students if s["id"] == rec["studentId"]), None)
        if student and not rec.get("itemId"):
            apply_item(rec, default_item(student, items))
        with_balances(rec)

    matched_invoices = []
    skipped_invoices = []
    for inv in square.get("invoices", []):
        student = match_student(inv["name"], students)
        if not student:
            skipped_invoices.append(inv["name"])
            continue
        item = items[inv["itemId"]]
        overlay_invoice(payments, student, inv, item)
        matched_invoices.append({"name": inv["name"], "id": student["id"], "invoice": inv["invoiceId"]})

    matched_subs = []
    skipped_subs = []
    for sub in square.get("subscriptions", []):
        student = match_student(sub["name"], students)
        if not student:
            skipped_subs.append(sub["name"])
            continue
        item = items[sub["itemId"]]
        overlay_subscription(payments, student, sub, item)
        matched_subs.append({"name": sub["name"], "id": student["id"], "item": sub["itemId"]})

    seed["payments"] = payments
    seed["groups"] = seed.get("groups") or []
    seed["_squareMerge"] = {
        "matchedInvoices": matched_invoices,
        "skippedInvoices": skipped_invoices,
        "matchedSubscriptions": matched_subs,
        "skippedSubscriptions": skipped_subs,
    }
    return seed


def main() -> None:
    seed = json.loads(SEED.read_text())
    square = json.loads(SQUARE.read_text())
    merged = merge_into(seed, square)
    report = merged.pop("_squareMerge")
    SEED.write_text(json.dumps(merged, indent=2) + "\n")
    print(f"Matched invoices ({len(report['matchedInvoices'])}):")
    for row in report["matchedInvoices"]:
        print(f"  {row['name']} -> #{row['id']} invoice {row['invoice']}")
    print(f"Skipped invoices (not on enrollment): {report['skippedInvoices']}")
    print(f"Matched subscriptions ({len(report['matchedSubscriptions'])}):")
    for row in report["matchedSubscriptions"]:
        print(f"  {row['name']} -> #{row['id']} {row['item']}")
    print(f"Skipped subscriptions (not on enrollment): {report['skippedSubscriptions']}")
    print(f"Wrote {len(merged['payments'])} payments -> {SEED}")


if __name__ == "__main__":
    main()
