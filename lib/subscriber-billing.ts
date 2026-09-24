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
  if (!nextDue && !overdueSince && lastPaidDate) nextDue = addCalendarMonth(lastPaidDate)
  if (!nextDue && noteStart && noteStart > today) nextDue = noteStart
  if (!nextDue && overdueSince) nextDue = overdueSince
  if (!overdueSince && nextDue && nextDue <= today) overdueSince = nextDue
  const amount =
    missed[0]?.balance ??
    missed[0]?.amount ??
    upcoming?.amount ??
    lastPaid?.amount ??
    (typeof student.nextPaymentAmount === "number" && student.nextPaymentAmount > 0 && student.nextPaymentAmount <= 120
      ? student.nextPaymentAmount
      : null)
  return { lastPaidDate, nextDue, amount: amount ?? null, overdueSince }
}
