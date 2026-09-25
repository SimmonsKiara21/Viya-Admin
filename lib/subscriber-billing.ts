import { deskOverdueSince } from "./alerts"
import { isDeskSubscriber } from "./desk-subscribers"
import { academyDateISO } from "./format"
import type { PaymentRecord, Student } from "./types"

export function isSubscriberInvoice(payment: PaymentRecord) {
  if (payment.itemKind === "subscriber") return true
  return (payment.itemId || "").startsWith("va-subscription")
}

export function subscriberInvoices(payments: PaymentRecord[], studentId: string) {
  return payments.filter((payment) => payment.studentId === studentId && isSubscriberInvoice(payment))
}

export function addCalendarMonth(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return ""
  let nextYear = year
  let nextMonth = month + 1
  if (nextMonth > 12) {
    nextYear += 1
    nextMonth = 1
  }
  const lastDay = new Date(nextYear, nextMonth, 0).getDate()
  const nextDay = Math.min(day, lastDay)
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`
}

function dateFromNotes(notes: string) {
  const text = notes || ""
  const starts = text.match(/starts?\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i)
  if (starts?.[1]) return monthDayToIso(starts[1])
  const leading = text.match(/(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+starts?/i)
  if (leading?.[1]) return monthDayToIso(leading[1])
  return ""
}

function monthDayToIso(value: string) {
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (!match) return ""
  const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : "2026"
  return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`
}

/** Square $49.99 plus tax — what actually charges on the standard plan. */
export const STANDARD_SUB_WITH_TAX = 51.49
/** Square $4.99 plus tax — same OG plan as $5.14. */
export const OG_SUB_WITH_TAX = 5.14

export function firstOfNextMonth(iso: string) {
  const [year, month] = iso.slice(0, 10).split("-").map(Number)
  if (!year || !month) return ""
  let nextYear = year
  let nextMonth = month + 1
  if (nextMonth > 12) {
    nextYear += 1
    nextMonth = 1
  }
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
}

export function withSubscriptionTax(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return null
  if (Math.abs(amount - 49.99) < 0.011 || Math.abs(amount - 49) < 0.011) return STANDARD_SUB_WITH_TAX
  if (Math.abs(amount - 4.99) < 0.011 || Math.abs(amount - 5) < 0.011) return OG_SUB_WITH_TAX
  return amount
}

function amountForPlan(student: Student, amount: number | null) {
  if (student.subscriptionPlan === "og") return OG_SUB_WITH_TAX
  if (student.subscriptionPlan === "standard") return STANDARD_SUB_WITH_TAX
  if (student.subscriptionPlan === "plus") return amount != null && amount >= 95 ? amount : 100
  return withSubscriptionTax(amount)
}

function cycleDueAfter(student: Student, lastPaidDate: string, today: string) {
  const custom = (student.subscriptionRunDate || student.startDate || "").slice(0, 10)
  if (custom && custom > today && (!lastPaidDate || custom > lastPaidDate)) return custom
  if (lastPaidDate) return firstOfNextMonth(lastPaidDate)
  if (custom && custom > today) return custom
  const thisFirst = `${today.slice(0, 7)}-01`
  return thisFirst >= today ? thisFirst : firstOfNextMonth(today)
}

export type SubscriberBilling = {
  lastPaidDate: string
  nextDue: string
  amount: number | null
  overdueSince: string
}

export function subscriberBilling(student: Student, payments: PaymentRecord[] = []): SubscriberBilling {
  const rows = subscriberInvoices(payments, student.id)
  const today = academyDateISO()
  const paid = [...rows]
    .filter((payment) => payment.status === "paid")
    .sort((a, b) => (b.paidDate || b.dueDate || "").localeCompare(a.paidDate || a.dueDate || ""))
  const lastPaid = paid[0]
  const lastPaidDate = (lastPaid?.paidDate || lastPaid?.dueDate || "").slice(0, 10)
  const open = [...rows]
    .filter((payment) => payment.status !== "paid")
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
  const missed = open.filter((payment) => (payment.dueDate || "") && payment.dueDate <= today)
  const upcoming = open.find((payment) => (payment.dueDate || "") > today)
  let overdueSince = (missed[0]?.dueDate || "").slice(0, 10)
  const noteStart = dateFromNotes(student.notes || "")
  let nextDue = (upcoming?.dueDate || "").slice(0, 10)
  if (!nextDue && !overdueSince) nextDue = cycleDueAfter(student, lastPaidDate, today)
  if (!nextDue && noteStart && noteStart > today) nextDue = noteStart
  if (!nextDue && overdueSince) nextDue = overdueSince
  if (!overdueSince && nextDue && nextDue <= today) overdueSince = nextDue
  const rawAmount =
    missed[0]?.balance ??
    missed[0]?.amount ??
    upcoming?.amount ??
    lastPaid?.amount ??
    (typeof student.nextPaymentAmount === "number" && student.nextPaymentAmount > 0 && student.nextPaymentAmount <= 120
      ? student.nextPaymentAmount
      : null)
  const amount = amountForPlan(student, rawAmount)
  const lockedSince = deskOverdueSince(student)
  const staffCurrent = student.deskLocks?.status && student.enrollmentStatus === "current"
  if (staffCurrent) {
    return {
      lastPaidDate,
      nextDue: (student.nextPaymentDate || nextDue || cycleDueAfter(student, lastPaidDate, today)).slice(0, 10),
      amount: amountForPlan(
        student,
        typeof student.nextPaymentAmount === "number" ? student.nextPaymentAmount : rawAmount,
      ),
      overdueSince: "",
    }
  }
  if (student.deskLocks?.subscription) {
    const due = (student.nextPaymentDate || nextDue || "").slice(0, 10)
    return {
      lastPaidDate,
      nextDue: due,
      amount: amountForPlan(
        student,
        typeof student.nextPaymentAmount === "number" ? student.nextPaymentAmount : rawAmount,
      ),
      overdueSince: lockedSince || (due && due <= today ? due : ""),
    }
  }
  return {
    lastPaidDate,
    nextDue,
    amount,
    overdueSince: lockedSince || overdueSince,
  }
}

export function subscriberIsOverdue(student: Student, payments: PaymentRecord[] = []) {
  if (!isDeskSubscriber(student)) return false
  if (student.program !== "subscriber" && student.paymentPlan !== "subscription") return false
  if (student.subscriptionStatus === "paused" || student.subscriptionStatus === "cancelled") return false
  return Boolean(subscriberBilling(student, payments).overdueSince)
}

export type SquareSubStanding = "current" | "overdue" | "interested" | "paused" | "cancelled" | "unknown"

export function squareSubscriberStanding(student: Student, payments: PaymentRecord[] = []): SquareSubStanding {
  if (student.subscriptionStatus === "paused") return "paused"
  if (student.subscriptionStatus === "cancelled") return "cancelled"
  const bill = subscriberBilling(student, payments)
  if (bill.overdueSince) return "overdue"
  if (bill.lastPaidDate || bill.nextDue) return "current"
  if (student.subscriptionStatus === "interested") return "interested"
  if (student.subscriptionStatus === "active") return "unknown"
  return "unknown"
}
