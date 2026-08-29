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

export function isContact(student: Student) {
  return student.program === "prospect" || student.enrollmentStatus === "contact"
}

export function isOverdueStudent(student: Student) {
  if (isContact(student)) return false
  return student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined"
}

export function isSubscriberStudent(student: Student) {
  return student.program === "subscriber" || student.paymentPlan === "subscription"
}

export function isAcademyOverdue(student: Student) {
  return isOverdueStudent(student) && !isSubscriberStudent(student)
}

export function isSubscriberOverdue(student: Student) {
  return isOverdueStudent(student) && isSubscriberStudent(student)
}

export function isCollectionsStudent(student: Student) {
  return student.enrollmentStatus === "collections"
}

export function isPausedStudent(student: Student) {
  return student.enrollmentStatus === "paused"
}

export function isPendingStudent(student: Student) {
  return student.enrollmentStatus === "pending" && !isContact(student)
}

export function isPaidInFull(student: Student) {
  if (isContact(student)) return false
  if (isCollectionsStudent(student) || isPausedStudent(student) || isPendingStudent(student)) return false
  if (isOverdueStudent(student)) return false
  return student.paymentPlan === "pif" || student.enrollmentStatus === "pif"
}

export type HighlightTone =
  | "overdue"
  | "subscriberOverdue"
  | "collections"
  | "paused"
  | "pending"
  | "finishing"
  | "pif"
  | "none"

export function monthsElapsed(startDate: string, asOf = new Date()) {
  if (!startDate) return 0
  const [y, m] = startDate.slice(0, 7).split("-").map(Number)
  if (!y || !m) return 0
  return Math.max(0, (asOf.getFullYear() - y) * 12 + (asOf.getMonth() + 1 - m))
}

export function remainingPayments(student: Student) {
  if (student.paymentPlan === "pif" || student.enrollmentStatus === "pif") return 0
  if (student.paymentPlan !== "pp") return null
  if (typeof student.installmentsLeft === "number") return Math.max(0, student.installmentsLeft)
  return Math.max(0, PLAN_LENGTH - monthsElapsed(student.startDate))
}

export function attendanceMonthCount(records: AttendanceRecord[], studentId: string) {
  const months = new Set(
    records.filter((r) => r.studentId === studentId).map((r) => r.checkedInAt.slice(0, 7)),
  )
  return months.size
}

/** Current academy payment-plan students who started May 2026 or earlier, with fewer than 3 installments left. */
export const WRAP_START_CUTOFF = "2026-05-31"

export function startedByMay2026(student: Student) {
  const start = (student.startDate || "").slice(0, 10)
  return Boolean(start) && start <= WRAP_START_CUTOFF
}

export function isFinishingSoon(student: Student) {
  if (student.program !== "academy") return false
  if (student.enrollmentStatus !== "current") return false
  if (student.paymentPlan !== "pp") return false
  if (!startedByMay2026(student)) return false
  const left = remainingPayments(student)
  return left != null && left < 3
}

export function highlightTone(student: Student): HighlightTone {
  if (isCollectionsStudent(student)) return "collections"
  if (isSubscriberOverdue(student)) return "subscriberOverdue"
  if (isAcademyOverdue(student)) return "overdue"
  if (isPausedStudent(student)) return "paused"
  if (isPendingStudent(student)) return "pending"
  if (isFinishingSoon(student)) return "finishing"
  if (isPaidInFull(student)) return "pif"
  return "none"
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
    const focus = classFocus(session.id === "saturday" ? "saturday" : "wednesday", next.dateISO)
    return { ...session, ...next, focus }
  }).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

const ROTATION = {
  saturday: { anchor: "2026-08-01", start: "acting" as const },
  wednesday: { anchor: "2026-08-05", start: "acting" as const },
}

export function classFocus(slot: "saturday" | "wednesday", dateISO: string) {
  const { anchor, start } = ROTATION[slot]
  const a = Date.parse(`${anchor}T12:00:00Z`)
  const b = Date.parse(`${dateISO}T12:00:00Z`)
  const weeks = Math.round((b - a) / (7 * 24 * 60 * 60 * 1000))
  const even = Math.abs(weeks) % 2 === 0
  const focus = even ? start : start === "acting" ? "modeling" : "acting"
  return focus
}

export function academyReminderBody(from = new Date()) {
  const upcoming = upcomingAcademyClasses(from)
  const lines = upcoming.map((session) => {
    const focus = session.focus === "acting" ? "Acting" : "Modeling"
    return `• ${session.display} — ${focus} (${session.label})`
  })
  return `Hi {{firstName}}, this week at Viya Academy:\n\n${lines.join("\n")}\n\nAll black, camera-ready. Check in at the front desk. See you on the floor.`
}

export function subscriberReminderBody() {
  return `Hi {{firstName}}, Viya subscriber workshop this cycle:\n\n• Saturday 1:30–3:30pm (before the 4pm academy class)\n• Aug 15 — Acting: Mastering the Actor Self-Tape\n• Aug 29 — Modeling: Justin Chambers with Laura Scheele, agency placement\n\nAll black, camera-ready. Text (602) 342-2902 if you have a question.`
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
