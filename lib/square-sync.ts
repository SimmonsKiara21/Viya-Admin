import type { PaymentRecord, PaymentStatus, SquareItemKind, Student } from "./types"
import { SQUARE_ITEMS } from "./square"
import { matchStudentByName } from "./match-name"
import { newId, todayISO } from "./format"
import { PLAN_LENGTH } from "./alerts"

export type SquareInvoiceRow = {
  name: string
  invoiceId: string
  itemId: string
  amount: number
  paid: number
  status: PaymentStatus
  dueDate: string
}

export type SquareSyncResult = {
  payments: PaymentRecord[]
  students: Student[]
  matched: number
  skipped: string[]
}

function itemForId(id: string) {
  return SQUARE_ITEMS.find((item) => item.id === id) ?? SQUARE_ITEMS.find((item) => item.id === "va101")!
}

function guessItemId(title: string): string {
  const text = (title || "").toLowerCase()
  if (text.includes("og")) return "va-subscription-og"
  if (text.includes("subscription")) return "va-subscription"
  if (text.includes("va102")) return "va102"
  if (text.includes("cancellation")) return "cancellation"
  if (text.includes("nov")) return "model-source-nov"
  if (text.includes("payment plan") && text.includes("model source")) return "model-source-pp"
  if (text.includes("model source")) return "model-source-pif"
  return "va101"
}

function money(cents: unknown) {
  if (typeof cents === "number" && Number.isFinite(cents)) return Math.round(cents) / 100
  if (cents && typeof cents === "object" && "amount" in cents) {
    const amount = (cents as { amount?: number }).amount
    if (typeof amount === "number") return Math.round(amount) / 100
  }
  return 0
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function mapInvoiceStatus(status: string, dueDate: string, paid: number, amount: number): PaymentStatus | null {
  const key = (status || "").toUpperCase()
  if (key === "DRAFT" || key === "CANCELED" || key === "CANCELLED") return null
  if (key === "PAID") return "paid"
  if (key === "FAILED") return "declined"
  if (key === "OVERDUE") return "overdue"
  if (key === "SCHEDULED") return "scheduled"
  if (paid > 0 && paid < amount) {
    if (dueDate && dueDate < todayISO()) return "overdue"
    return "due"
  }
  if (dueDate && dueDate < todayISO() && key !== "PAID") return "overdue"
  if (key === "UNPAID" || key === "PARTIALLY_PAID" || key === "PAYMENT_PENDING") return "due"
  return "due"
}

export function invoicesFromSquareApi(raw: unknown[], customerNames: Record<string, string>): SquareInvoiceRow[] {
  const rows: SquareInvoiceRow[] = []
  for (const entry of raw) {
    const invoice = asRecord(entry)
    if (!invoice) continue
    const recipient = asRecord(invoice.primary_recipient)
    const customerId = typeof recipient?.customer_id === "string" ? recipient.customer_id : ""
    const given = typeof recipient?.given_name === "string" ? recipient.given_name : ""
    const family = typeof recipient?.family_name === "string" ? recipient.family_name : ""
    const name = `${given} ${family}`.trim() || customerNames[customerId] || ""
    const requests = Array.isArray(invoice.payment_requests) ? invoice.payment_requests : []
    const request = asRecord(requests[0]) ?? {}
    const amount = money(request.computed_amount_money)
    const paid = money(request.total_completed_amount_money)
    const dueDate = typeof request.due_date === "string" ? request.due_date : ""
    const status = mapInvoiceStatus(String(invoice.status || ""), dueDate, paid, amount)
    if (!status || !name) continue
    const title = String(invoice.title || invoice.description || "")
    rows.push({
      name,
      invoiceId: String(invoice.invoice_number || invoice.id || ""),
      itemId: guessItemId(title),
      amount: amount || paid,
      paid,
      status,
      dueDate,
    })
  }
  return rows
}

export function applySquareInvoices(students: Student[], payments: PaymentRecord[], invoices: SquareInvoiceRow[]): SquareSyncResult {
  const nextStudents = students.map((s) => ({ ...s }))
  const nextPayments = payments.map((p) => ({ ...p }))
  const skipped: string[] = []
  const matchedIds = new Set<string>()
  let matched = 0

  for (const inv of invoices) {
    const student = matchStudentByName(inv.name, nextStudents)
    if (!student) {
      skipped.push(inv.name)
      continue
    }
    matched += 1
    matchedIds.add(student.id)
    overlayInvoice(nextPayments, student, inv)
  }

  refreshStudentsFromPayments(nextStudents, nextPayments, matchedIds)
  return { students: nextStudents, payments: nextPayments, matched, skipped: [...new Set(skipped)] }
}

function overlayInvoice(payments: PaymentRecord[], student: Student, inv: SquareInvoiceRow) {
  const item = itemForId(inv.itemId)
  const amount = inv.amount || 0
  const paid = inv.paid || 0
  const balance = Math.max(Math.round((amount - paid) * 100) / 100, 0)
  let rec =
    payments.find((p) => p.studentId === student.id && p.squareInvoiceId === String(inv.invoiceId)) ??
    (inv.status !== "paid"
      ? payments.find((p) => p.studentId === student.id && p.itemId === item.id && ["due", "overdue", "declined", "scheduled"].includes(p.status))
      : payments.find((p) => p.studentId === student.id && p.itemId === item.id && p.status === "paid"))

  if (!rec) {
    rec = {
      id: newId("pay"),
      studentId: student.id,
      amount,
      paidAmount: paid,
      balance,
      dueDate: inv.dueDate,
      paidDate: inv.status === "paid" ? inv.dueDate : "",
      status: inv.status,
      method: "square",
      squareInvoiceId: String(inv.invoiceId),
      notes: `Square invoice ${inv.invoiceId} · ${item.name}`,
      itemId: item.id,
      itemName: item.name,
      itemDescription: item.description || "",
      itemKind: (item.kind || "academy") as SquareItemKind,
      source: "square",
    }
    payments.push(rec)
  } else {
    rec.amount = amount
    rec.paidAmount = paid
    rec.balance = balance
    rec.dueDate = inv.dueDate || rec.dueDate
    rec.paidDate = inv.status === "paid" ? inv.dueDate || rec.paidDate : rec.paidDate
    rec.status = inv.status
    rec.method = "square"
    rec.squareInvoiceId = String(inv.invoiceId)
    rec.notes = `Square invoice ${inv.invoiceId} · ${item.name}`
    rec.itemId = item.id
    rec.itemName = item.name
    rec.itemDescription = item.description || ""
    rec.itemKind = (item.kind || "academy") as SquareItemKind
    rec.source = "square"
  }
}

function isAcademyItem(itemId: string, itemKind: SquareItemKind) {
  return itemKind === "academy" || itemId === "va101" || itemId === "va102"
}

function refreshStudentsFromPayments(
  students: Student[],
  payments: PaymentRecord[],
  matchedIds: Set<string>,
) {
  for (const student of students) {
    if (!matchedIds.has(student.id)) continue
    const rows = payments.filter((p) => p.studentId === student.id)
    const open = rows
      .filter((p) => ["due", "overdue", "declined", "scheduled"].includes(p.status))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
    const next = open[0]
    if (next) {
      const subscriber = student.program === "subscriber" || student.paymentPlan === "subscription"
      // Workbook STATUS / notes own academy enrollment and next-due copy.
      // Square invoices stay on Payments and must not mark talent overdue.
      if (subscriber) {
        student.nextPaymentDate = next.dueDate || student.nextPaymentDate
        student.nextPaymentAmount = next.balance || next.amount
      }
    }
    const academy = rows.filter((p) => isAcademyItem(p.itemId, p.itemKind))
    const plan = academy.find((p) => p.amount >= 400) ?? academy[0]
    if (plan && student.paymentPlan === "pp") {
      const monthly = plan.amount / PLAN_LENGTH
      student.installmentsLeft =
        monthly > 0 ? Math.max(0, Math.ceil(Math.max(plan.balance, 0) / monthly - 1e-9)) : student.installmentsLeft
    }
  }
}

export function squareFingerprint(invoices: SquareInvoiceRow[]) {
  return invoices
    .map((row) => `${row.invoiceId}:${row.status}:${row.dueDate}:${row.amount}:${row.paid}`)
    .sort()
    .join("|")
}
