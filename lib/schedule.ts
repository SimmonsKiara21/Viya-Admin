import type { PaymentRecord, PaymentSource, PaymentStatus, Student } from "./types"
import { remainingPayments } from "./alerts"
import { todayISO } from "./format"

export type ScheduleRow = {
  date: string
  amount: number
  paidAmount: number
  balance: number
  status: PaymentStatus
  label: string
  invoiceId: string
  fromSquare: boolean
  source: PaymentSource
  paymentId?: string
}

export function paymentSourceLabel(source: PaymentSource) {
  if (source === "square") return "Square"
  if (source === "manual") return "Desk"
  return "Enrollment"
}

export function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

/** Academy invoices run every two weeks on Friday (9/18 then 10/02). */
export function snapToFriday(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  const add = (5 - date.getUTCDay() + 7) % 7
  date.setUTCDate(date.getUTCDate() + add)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

export function biweeklyFridays(start: string, count: number) {
  const n = Math.max(0, Math.floor(count))
  if (!start || !n) return []
  let date = snapToFriday(start)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    out.push(date)
    date = addDaysISO(date, 14)
  }
  return out
}

export function paymentFromScheduleRow(student: Student, row: ScheduleRow): Omit<PaymentRecord, "id"> {
  return {
    studentId: student.id,
    amount: row.amount,
    paidAmount: row.paidAmount,
    balance: row.balance,
    dueDate: row.date,
    paidDate: row.status === "paid" ? todayISO() : "",
    status: row.status,
    method: row.source === "square" ? "square" : "other",
    squareInvoiceId: row.invoiceId || "",
    notes: "",
    itemId: "",
    itemName: row.label || "Payment",
    itemDescription: "",
    itemKind: student.program === "subscriber" ? "subscriber" : "academy",
    source: row.source === "square" ? "square" : "manual",
  }
}

function rowFromBill(bill: PaymentRecord): ScheduleRow {
  return {
    date: bill.dueDate,
    amount: bill.amount,
    paidAmount: bill.paidAmount,
    balance: bill.balance,
    status: bill.status,
    label: bill.itemName || (bill.source === "square" ? "Square invoice" : "Payment"),
    invoiceId: bill.squareInvoiceId,
    fromSquare: bill.source === "square",
    source: bill.source,
    paymentId: bill.id,
  }
}

function openStatuses(status: PaymentStatus) {
  return status === "due" || status === "overdue" || status === "declined" || status === "scheduled"
}

function soonestOpen(bills: PaymentRecord[]) {
  return [...bills]
    .filter((bill) => openStatuses(bill.status))
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0]
}

function latestBill(bills: PaymentRecord[]) {
  return [...bills].sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""))[0]
}

function syntheticDue(student: Student): ScheduleRow {
  const today = todayISO()
  const date = student.nextPaymentDate
  const amount = student.nextPaymentAmount || 0
  const past = Boolean(date && date < today)
  const overdue = student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined"
  return {
    date,
    amount,
    paidAmount: 0,
    balance: amount,
    status: overdue ? "overdue" : past ? "due" : "scheduled",
    label: "Most recent payment due",
    invoiceId: "",
    fromSquare: false,
    source: "workbook",
  }
}

function pifRow(student: Student): ScheduleRow {
  const today = todayISO()
  return {
    date: student.startDate || today,
    amount: student.nextPaymentAmount || 0,
    paidAmount: student.nextPaymentAmount || 0,
    balance: 0,
    status: "paid",
    label: "Paid in full",
    invoiceId: "",
    fromSquare: false,
    source: "workbook",
  }
}

/** Square invoices when we have them; otherwise only the next real due — never a filled-in monthly plan. */
export function buildPaymentSchedule(student: Student, payments: PaymentRecord[]): ScheduleRow[] {
  const bills = payments
    .filter((p) => p.studentId === student.id)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
  const square = bills.filter((p) => p.source === "square")
  const desk = bills.filter((p) => p.source === "manual")

  if (square.length) {
    return [...square, ...desk]
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
      .map(rowFromBill)
  }

  if (desk.length) {
    return desk.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).map(rowFromBill)
  }

  const one = soonestOpen(bills) || latestBill(bills)
  if (one) return [rowFromBill(one)]

  if (student.paymentPlan === "pif" || student.enrollmentStatus === "pif") {
    return [pifRow(student)]
  }

  if (student.nextPaymentDate) return [syntheticDue(student)]
  return []
}

export function nextShownDue(student: Student, payments: PaymentRecord[]) {
  const rows = buildPaymentSchedule(student, payments)
  const today = todayISO()
  return (
    rows.find((row) => openStatuses(row.status) && row.date) ||
    rows.find((row) => row.date && row.date >= today) ||
    rows[rows.length - 1] ||
    null
  )
}

export function fillCountForStudent(student: Student) {
  const left = remainingPayments(student)
  if (left != null && left > 0) return Math.min(left, 12)
  return 6
}
