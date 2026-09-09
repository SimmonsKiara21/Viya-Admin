import type { PaymentRecord, PaymentStatus, SquareItemKind, Student } from "./types"
import { SQUARE_ITEMS, displayPaymentNotes } from "./square"
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
    if (!name) continue
    const requests = Array.isArray(invoice.payment_requests) ? invoice.payment_requests : []
    const title = String(invoice.title || invoice.description || "")
    const invoiceNumber = String(invoice.invoice_number || invoice.id || "")
    const itemId = guessItemId(title)
    const requestList = requests.length ? requests : [null]
    for (const entryReq of requestList) {
      const request = asRecord(entryReq) ?? {}
      const amount = money(request.computed_amount_money) || money(request.total_completed_amount_money)
      const paid = money(request.total_completed_amount_money)
      const dueDate = typeof request.due_date === "string" ? request.due_date : ""
      const uid = typeof request.uid === "string" && request.uid ? request.uid : dueDate
      let status = mapInvoiceStatus(String(invoice.status || ""), dueDate, paid, amount)
      if (!status) continue
      if (amount > 0 && paid >= amount) status = "paid"
      else if (dueDate && dueDate < todayISO() && status !== "paid") status = "overdue"
      rows.push({
        name,
        invoiceId: requestList.length > 1 && uid ? `${invoiceNumber}:${uid}` : invoiceNumber,
        itemId,
        amount: amount || paid,
        paid,
        status,
        dueDate,
      })
    }
  }
  return rows
}

export function applySquareInvoices(students: Student[], payments: PaymentRecord[], invoices: SquareInvoiceRow[]): SquareSyncResult {
  const nextStudents = students.map((s) => ({ ...s }))
  const nextPayments = payments.map((p) => ({ ...p }))
  const skipped: string[] = []
  const matchedIds = new Set<string>()
  const incomingByStudent = new Map<string, Set<string>>()
  let matched = 0

  for (const inv of invoices) {
    const student = matchStudentByName(inv.name, nextStudents)
    if (!student) {
      skipped.push(inv.name)
      continue
    }
    matched += 1
    matchedIds.add(student.id)
    const ids = incomingByStudent.get(student.id) ?? new Set<string>()
    ids.add(String(inv.invoiceId))
    incomingByStudent.set(student.id, ids)
    overlayInvoice(nextPayments, student, inv)
  }

  const pruned = nextPayments.filter((p) => {
    const ids = incomingByStudent.get(p.studentId)
    if (!ids || p.source !== "square") return true
    if (ids.has(p.squareInvoiceId)) return true
    if (p.status === "paid") return true
    return false
  })

  refreshStudentsFromPayments(nextStudents, pruned, matchedIds)
  return { students: nextStudents, payments: pruned, matched, skipped: [...new Set(skipped)] }
}

function overlayInvoice(payments: PaymentRecord[], student: Student, inv: SquareInvoiceRow) {
  const item = itemForId(inv.itemId)
  const amount = inv.amount || 0
  const paid = inv.paid || 0
  const balance = Math.max(Math.round((amount - paid) * 100) / 100, 0)
  let rec =
    payments.find((p) => p.studentId === student.id && p.squareInvoiceId === String(inv.invoiceId)) ??
    payments.find(
      (p) =>
        p.studentId === student.id &&
        p.source === "square" &&
        p.dueDate === inv.dueDate &&
        p.itemId === item.id,
    )

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
      notes: "",
      itemId: item.id,
      itemName: item.name,
      itemDescription: "",
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
    rec.notes = displayPaymentNotes(rec.notes)
    rec.itemId = item.id
    rec.itemName = item.name
    rec.itemDescription = ""
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
      student.nextPaymentDate = next.dueDate || student.nextPaymentDate
      student.nextPaymentAmount = next.balance || next.amount
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
