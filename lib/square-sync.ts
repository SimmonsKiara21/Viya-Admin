import type { PaymentRecord, PaymentStatus, SquareItemKind, Student } from "./types"
import { isPaidInFull } from "./alerts"
import { isDeskSubscriber } from "./desk-subscribers"
import { subscriberBilling } from "./subscriber-billing"
import { SQUARE_ITEMS, displayPaymentNotes } from "./square"
import { matchStudentByName } from "./match-name"
import { displayStudentId, newId, parseStudentId, todayISO } from "./format"

export type SquareInvoiceRow = {
  name: string
  studentId?: string
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

function mapRequestStatus(invoiceStatus: string, dueDate: string, paid: number, amount: number): PaymentStatus | null {
  const key = (invoiceStatus || "").toUpperCase()
  if (key === "DRAFT" || key === "CANCELED" || key === "CANCELLED") return null
  if (amount > 0 && paid >= amount) return "paid"
  if (key === "FAILED") return "declined"
  if (dueDate && dueDate <= todayISO()) return "overdue"
  if (dueDate && dueDate > todayISO()) return "scheduled"
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
    const number = String(invoice.invoice_number || "").trim()
    const name = `${given} ${family}`.trim() || customerNames[customerId] || ""
    if (!name && !number) continue
    const requests = Array.isArray(invoice.payment_requests) ? invoice.payment_requests : []
    const title = String(invoice.title || invoice.description || "")
    const invoiceId = String(invoice.id || invoice.invoice_number || "")
    const itemId = guessItemId(title)
    const requestList = requests.length ? requests : [null]
    for (const entryReq of requestList) {
      const request = asRecord(entryReq) ?? {}
      const amount =
        money(request.computed_amount_money) ||
        money(request.fixed_amount_requested_money) ||
        money(request.total_completed_amount_money)
      const paid = money(request.total_completed_amount_money)
      const dueDate = typeof request.due_date === "string" ? request.due_date : ""
      const uid = typeof request.uid === "string" && request.uid ? request.uid : dueDate
      if (!amount && !paid) continue
      const status = mapRequestStatus(String(invoice.status || ""), dueDate, paid, amount)
      if (!status) continue
      rows.push({
        name: name || number,
        studentId: number,
        invoiceId: uid ? `${invoiceId}:${uid}` : invoiceId,
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
    const student = matchInvoiceStudent(inv, nextStudents)
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
    if (p.source !== "square") return true
    if (!matchedIds.has(p.studentId)) return true
    const ids = incomingByStudent.get(p.studentId)
    return Boolean(ids?.has(p.squareInvoiceId))
  })

  refreshStudentsFromPayments(nextStudents, pruned, matchedIds)
  return { students: nextStudents, payments: pruned, matched, skipped: [...new Set(skipped)] }
}

function matchInvoiceStudent(inv: SquareInvoiceRow, students: Student[]): Student | undefined {
  const sid = parseStudentId(inv.studentId || "")
  if (sid) {
    const hit = students.find((student) => displayStudentId(student.id) === sid || student.id === inv.studentId)
    if (hit) return hit
  }
  return matchStudentByName(inv.name, students)
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
      .filter((p) => p.source === "square" && ["due", "overdue", "declined", "scheduled"].includes(p.status))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
    const next = open[0]
    if (next) {
      student.nextPaymentDate = next.dueDate || student.nextPaymentDate
      student.nextPaymentAmount = next.balance || next.amount
    } else if (rows.some((p) => p.source === "square")) {
      student.nextPaymentDate = ""
      student.nextPaymentAmount = null
    }
    const academy = rows.filter((p) => isAcademyItem(p.itemId, p.itemKind) && p.source === "square")
    const openAcademy = academy.filter((p) => ["due", "overdue", "declined", "scheduled"].includes(p.status))
    if (student.paymentPlan === "pp" && !student.deskLocks?.installments) {
      if (openAcademy.length) {
        student.installmentsLeft = openAcademy.length
      } else if (academy.length) {
        student.installmentsLeft = 0
      }
    }
    markMissedPaymentOverdue(student, rows)
    if (isDeskSubscriber(student) && !student.deskLocks?.subscription) {
      const bill = subscriberBilling(student, rows)
      const hasSquare = Boolean(bill.lastPaidDate || bill.nextDue || bill.overdueSince)
      if (hasSquare && (student.subscriptionStatus === "none" || student.subscriptionStatus === "interested")) {
        student.subscriptionStatus = "active"
      }
      if (hasSquare && !student.deskLocks?.status && !PROTECTED_STATUS.has(student.enrollmentStatus)) {
        student.enrollmentStatus = bill.overdueSince ? "overdue" : "current"
      }
    }
  }
}

const PROTECTED_STATUS = new Set(["collections", "cancelling", "paused", "contact"])

/** Unpaid Square/desk rows on or before today — including 09/17–09/19 — make the student overdue. */
export function paymentIsMissed(payment: PaymentRecord, today = todayISO()) {
  if (payment.status === "paid") return false
  if (payment.source === "workbook") return false
  const due = (payment.dueDate || "").slice(0, 10)
  return Boolean(due) && due <= today
}

export function markMissedPaymentOverdue(student: Student, payments: PaymentRecord[], today = todayISO()) {
  if (student.program === "prospect" || student.enrollmentStatus === "contact") return student
  if (PROTECTED_STATUS.has(student.enrollmentStatus)) return student
  const rows = payments.filter((p) => p.studentId === student.id && paymentIsMissed(p, today))
  if (!rows.length) return student
  const subscriber = student.program === "subscriber" || student.paymentPlan === "subscription"
  if (subscriber) {
    student.enrollmentStatus = "overdue"
    return student
  }
  if (isPaidInFull(student)) return student
  const academyMissed = rows.some((p) => isAcademyItem(p.itemId, p.itemKind) || p.source === "manual")
  if (academyMissed) student.enrollmentStatus = "overdue"
  return student
}

export function squareFingerprint(invoices: SquareInvoiceRow[]) {
  return invoices
    .map((row) => `${row.invoiceId}:${row.status}:${row.dueDate}:${row.amount}:${row.paid}`)
    .sort()
    .join("|")
}
