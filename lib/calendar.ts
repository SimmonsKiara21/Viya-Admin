import { isContact } from "@/lib/alerts"
import { todayISO } from "@/lib/format"
import type { PaymentRecord, PaymentStatus, Student } from "@/lib/types"

export type CalendarRun = {
  date: string
  student: Student
  amount: number | null
  label: string
  status: PaymentStatus
}

function dayCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const startPad = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<{ date: string | null; day: number | null }> = []
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null })
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month).padStart(2, "0")
    const dd = String(day).padStart(2, "0")
    cells.push({ date: `${year}-${mm}-${dd}`, day })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  return cells
}

export function monthGrid(iso: string) {
  const [y, m] = iso.slice(0, 7).split("-").map(Number)
  return {
    year: y,
    month: m,
    cells: dayCells(y, m),
  }
}

export function shiftMonth(iso: string, delta: number) {
  const [y, m] = iso.slice(0, 7).split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`
}

function openStatus(status: PaymentStatus) {
  return status === "due" || status === "overdue" || status === "scheduled" || status === "declined"
}

export function calendarRuns(students: Student[], payments: PaymentRecord[]): CalendarRun[] {
  const byStudent = new Map<string, Student>()
  for (const student of students) byStudent.set(student.id, student)
  const seen = new Set<string>()
  const runs: CalendarRun[] = []

  for (const bill of payments) {
    const student = byStudent.get(bill.studentId)
    if (!student || isContact(student) || !bill.dueDate) continue
    if (!openStatus(bill.status)) continue
    const key = `${student.id}:${bill.dueDate}`
    seen.add(key)
    runs.push({
      date: bill.dueDate.slice(0, 10),
      student,
      amount: bill.balance || bill.amount,
      label: bill.itemName || (bill.source === "manual" ? "Desk schedule" : "Payment"),
      status: bill.status,
    })
  }

  for (const student of students) {
    if (isContact(student) || !student.nextPaymentDate) continue
    const date = student.nextPaymentDate.slice(0, 10)
    const key = `${student.id}:${date}`
    if (seen.has(key)) continue
    if (student.enrollmentStatus === "pif" || student.paymentPlan === "pif") continue
    runs.push({
      date,
      student,
      amount: student.nextPaymentAmount,
      label: "Next payment",
      status: student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined" ? "overdue" : "due",
    })
  }

  return runs.sort((a, b) => a.date.localeCompare(b.date) || a.student.lastName.localeCompare(b.student.lastName))
}

export function runsOnDate(runs: CalendarRun[], date: string) {
  return runs.filter((run) => run.date === date)
}

export function datesWithRuns(runs: CalendarRun[]) {
  return new Set(runs.map((run) => run.date))
}

export function todayRuns(runs: CalendarRun[]) {
  return runsOnDate(runs, todayISO())
}
