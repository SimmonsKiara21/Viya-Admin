import { isContact } from "@/lib/alerts"
import { todayISO } from "@/lib/format"
import { buildPaymentSchedule, paymentSourceLabel } from "@/lib/schedule"
import type { PaymentRecord, PaymentSource, PaymentStatus, Student } from "@/lib/types"

export type CalendarRun = {
  date: string
  student: Student
  amount: number | null
  label: string
  status: PaymentStatus
  source: PaymentSource
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
  const runs: CalendarRun[] = []

  for (const student of students) {
    if (isContact(student)) continue
    const seen = new Set<string>()
    for (const row of buildPaymentSchedule(student, payments)) {
      if (!row.date || !openStatus(row.status)) continue
      const date = row.date.slice(0, 10)
      if (seen.has(`${student.id}:${date}`)) continue
      seen.add(`${student.id}:${date}`)
      runs.push({
        date,
        student,
        amount: row.balance || row.amount,
        label: `${paymentSourceLabel(row.source)} · ${row.label}`,
        status: row.status,
        source: row.source,
      })
    }
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
