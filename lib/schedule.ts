import type { PaymentRecord, PaymentStatus, Student } from "./types"
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
}

function addMonthsISO(iso: string, months: number) {
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
        fromSquare: Boolean(match?.source === "square" || sub),
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
      },
    ]
  }

  const start = student.startDate || bills[0]?.dueDate
  if (!start) {
    return bills.map((bill) => ({
      date: bill.dueDate,
      amount: bill.amount,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      status: bill.status,
      label: bill.itemName || "Square invoice",
      invoiceId: bill.squareInvoiceId,
      fromSquare: bill.source === "square",
    }))
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
    })
  }

  if (sq) {
    const nextOpen = rows.find((r) => r.status !== "paid")
    if (nextOpen) {
      nextOpen.invoiceId = sq.squareInvoiceId
      nextOpen.fromSquare = true
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
