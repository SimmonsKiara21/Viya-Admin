import type { AttendanceRecord, Student } from "./types"

export const PLAN_LENGTH = 6
export const TIMEZONE = "America/Phoenix"

export const ACADEMY_SESSIONS = [
  {
    id: "wednesday",
    weekday: 3,
    weekdayLabel: "Wednesday",
    start: "19:30",
    end: "20:30",
    display: "Wednesday 7:30–8:30pm",
    kind: "academy" as const,
  },
  {
    id: "saturday",
    weekday: 6,
    weekdayLabel: "Saturday",
    start: "16:00",
    end: "17:00",
    display: "Saturday 4:00–5:00pm",
    kind: "academy" as const,
  },
]

export function isOverdueStudent(student: Student) {
  return ["overdue", "declined", "collections"].includes(student.enrollmentStatus)
}

export function monthsElapsed(startDate: string, asOf = new Date()) {
  if (!startDate) return 0
  const [y, m] = startDate.slice(0, 7).split("-").map(Number)
  if (!y || !m) return 0
  return Math.max(0, (asOf.getFullYear() - y) * 12 + (asOf.getMonth() + 1 - m))
}

export function remainingPayments(student: Student) {
  if (student.paymentPlan === "pif" || student.enrollmentStatus === "pif") return 0
  if (student.paymentPlan !== "pp") return null
  return Math.max(0, PLAN_LENGTH - monthsElapsed(student.startDate))
}

export function attendanceMonthCount(records: AttendanceRecord[], studentId: string) {
  const months = new Set(
    records.filter((r) => r.studentId === studentId).map((r) => r.checkedInAt.slice(0, 7)),
  )
  return months.size
}

export function isFinishingSoon(student: Student, attendance: AttendanceRecord[]) {
  if (student.program !== "academy") return false
  if (student.enrollmentStatus !== "current") return false
  const left = remainingPayments(student)
  if (left == null || left > 3) return false
  return attendanceMonthCount(attendance, student.id) >= 2
}

export function highlightTone(student: Student, attendance: AttendanceRecord[]) {
  if (isOverdueStudent(student)) return "overdue" as const
  if (isFinishingSoon(student, attendance)) return "finishing" as const
  return "none" as const
}

function phoenixNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ""
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  }
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function nextClassOccurrence(
  weekday: number,
  startHHmm: string,
  from = new Date(),
) {
  const now = phoenixNow(from)
  const [sh, sm] = startHHmm.split(":").map(Number)
  const todayIdx = WEEKDAY_INDEX[now.weekday] ?? from.getDay()
  let add = (weekday - todayIdx + 7) % 7
  if (add === 0 && (now.hour > sh || (now.hour === sh && now.minute >= sm))) add = 7
  const utc = Date.UTC(now.year, now.month - 1, now.day, 12, 0, 0)
  const when = new Date(utc + add * 24 * 60 * 60 * 1000)
  const y = when.getUTCFullYear()
  const m = String(when.getUTCMonth() + 1).padStart(2, "0")
  const d = String(when.getUTCDate()).padStart(2, "0")
  return {
    dateISO: `${y}-${m}-${d}`,
    label: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(when),
  }
}

export function upcomingAcademyClasses(from = new Date()) {
  return ACADEMY_SESSIONS.map((session) => {
    const next = nextClassOccurrence(session.weekday, session.start, from)
    return { ...session, ...next }
  }).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

export function academyReminderBody() {
  return `Hi {{firstName}}, this week at Viya Academy:

• Wednesday 7:30–8:30pm
• Saturday 4:00–5:00pm

Check in at the front desk when you arrive. See you on the floor.`
}

export function overdueStudentBody(student: Student) {
  const due = student.nextPaymentDate
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(student.nextPaymentDate + "T12:00:00"),
      )
    : "as soon as you can"
  const amount = student.nextPaymentAmount
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
        student.nextPaymentAmount,
      )
    : "your balance"
  return `Hi ${student.nickname || student.firstName}, this is Viya Academy. Your Square payment of ${amount} was due ${due} and is now overdue. Please update your card or reply here so we can help. Front desk: (602) 342-2902.`
}
