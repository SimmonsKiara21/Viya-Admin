import type { PaymentRecord, PaymentSource, PaymentStatus, Student } from "./types"
import { PLAN_LENGTH, remainingPayments } from "./alerts"
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
}

export function paymentSourceLabel(source: PaymentSource) {
  if (source === "square") return "Square"
  if (source === "manual") return "Desk"
  return "Enrollment"
}

export function addMonthsISO(iso: string, months: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1 + months, d)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

function monthKey(iso: string) {
  return iso.slice(0, 7)
}

function billForMonth(bills: PaymentRecord[], date: string) {
  return bills.find((b) => monthKey(b.dueDate) === monthKey(date))
}

export function buildPaymentSchedule(student: Student, payments: PaymentRecord[]): ScheduleRow[] {
  const bills = payments
    .filter((p) => p.studentId === student.id)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
  const square = bills.filter((p) => p.source === "square")
  const today = todayISO()

  if (student.paymentPlan === "subscription" || student.program === "subscriber") {
    const sub = square.find((p) => p.itemKind === "subscriber") ?? bills[0]
    const amount = sub?.amount ?? student.nextPaymentAmount ?? 51.49
    const anchor = student.nextPaymentDate || sub?.dueDate || today
    const rows: ScheduleRow[] = []
    for (let i = -2; i <= 3; i++) {
      const date = addMonthsISO(anchor, i)
      const match = billForMonth(bills, date)
      const past = date < today
      const status: PaymentStatus = match?.status
        ?? (date === (student.nextPaymentDate || "") ? (student.enrollmentStatus === "overdue" ? "overdue" : "due") : past ? "paid" : "scheduled")
      rows.push({
        date: match?.dueDate || date,
        amount: match?.amount ?? amount,
        paidAmount: match?.paidAmount ?? (status === "paid" ? amount : 0),
        balance: match?.balance ?? (status === "paid" ? 0 : amount),
        status,
        label: match?.itemName || "Viya Talent Subscription",
        invoiceId: match?.squareInvoiceId || sub?.squareInvoiceId || "",
        fromSquare: Boolean(match?.source === "square" || (sub && i === 0)),
        source: match?.source || (sub && i === 0 ? "square" : "workbook"),
      })
    }
    return rows
  }

  if (student.paymentPlan === "pif" || student.enrollmentStatus === "pif") {
    if (bills.length) {
      return bills.map((bill) => ({
        date: bill.dueDate,
        amount: bill.amount,
        paidAmount: bill.paidAmount,
        balance: bill.balance,
        status: bill.status,
        label: bill.itemName || "Paid in full",
        invoiceId: bill.squareInvoiceId,
        fromSquare: bill.source === "square",
        source: bill.source,
      }))
    }
    return [
      {
        date: student.startDate || today,
        amount: student.nextPaymentAmount || 1850,
        paidAmount: student.nextPaymentAmount || 1850,
        balance: 0,
        status: "paid",
        label: "Paid in full",
        invoiceId: "",
        fromSquare: false,
        source: "workbook",
      },
    ]
  }

  const start = student.startDate || bills[0]?.dueDate
  if (!start) {
    const rows: ScheduleRow[] = bills.map((bill) => ({
      date: bill.dueDate,
      amount: bill.amount,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      status: bill.status,
      label: bill.itemName || "Square invoice",
      invoiceId: bill.squareInvoiceId,
      fromSquare: bill.source === "square",
      source: bill.source,
    }))
    if (student.nextPaymentDate && !rows.some((row) => row.date.slice(0, 10) === student.nextPaymentDate.slice(0, 10))) {
      const amount = student.nextPaymentAmount || 104
      const past = student.nextPaymentDate < today
      rows.push({
        date: student.nextPaymentDate,
        amount,
        paidAmount: 0,
        balance: amount,
        status:
          student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined"
            ? "overdue"
            : past
              ? "due"
              : "scheduled",
        label: "Enrollment next payment",
        invoiceId: "",
        fromSquare: false,
        source: "workbook",
      })
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  }

  const left = remainingPayments(student)
  const installment = student.nextPaymentAmount || 104
  const sq = square.find((p) => p.itemKind === "academy") ?? square[0]
  const rows: ScheduleRow[] = []

  for (let i = 0; i < PLAN_LENGTH; i++) {
    const date = addMonthsISO(start, i)
    const match = billForMonth(bills, date)
    const past = date < today.slice(0, 10)
    const remainingIndex = left == null ? null : PLAN_LENGTH - left
    let status: PaymentStatus = match?.status ?? (past ? "paid" : "scheduled")
    if (!match && remainingIndex != null && i === remainingIndex) {
      status = student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined" ? "overdue" : "due"
    }
    if (!match && remainingIndex != null && i > remainingIndex && !past) status = "scheduled"

    rows.push({
      date: match?.dueDate || (i === remainingIndex ? student.nextPaymentDate || date : date),
      amount: match?.amount ?? installment,
      paidAmount: match?.paidAmount ?? (status === "paid" ? installment : 0),
      balance: match?.balance ?? (status === "paid" ? 0 : installment),
      status,
      label: match?.itemName || sq?.itemName || "VA101 Modelling & Acting Training",
      invoiceId: match?.squareInvoiceId || "",
      fromSquare: match?.source === "square",
      source: match?.source || "workbook",
    })
  }

  if (sq) {
    const nextOpen = rows.find((r) => r.status !== "paid")
    if (nextOpen) {
      nextOpen.invoiceId = sq.squareInvoiceId
      nextOpen.fromSquare = true
      nextOpen.source = "square"
      nextOpen.label = sq.itemName || nextOpen.label
      nextOpen.status = sq.status
      nextOpen.date = sq.dueDate || nextOpen.date
      if (sq.balance > 0 && (left ?? 1) <= 1) {
        nextOpen.amount = sq.balance
        nextOpen.balance = sq.balance
        nextOpen.paidAmount = sq.paidAmount
      }
    }
  }

  return rows
}
