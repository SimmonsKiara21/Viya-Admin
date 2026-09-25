import { ACADEMY_TIMEZONE, PAID_PIF_IDS, PAID_PIF_NAMES } from "./constants"
import { isActiveSubscriber } from "./contacts-labels"
import { academyDateISO, displayStudentId } from "./format"
import { foldName } from "./match-name"
import type { AttendanceRecord, PaymentRecord, Student } from "./types"

export const PLAN_LENGTH = 6
export const TIMEZONE = ACADEMY_TIMEZONE

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

/** Workbook notes mark a declined card. Those people sit on Overdue, not a separate list. */
export function notesSayPaymentDeclined(notes: string) {
  return /(?:payment|card)\s+declined|declined\s+\d{1,2}\/\d{1,2}/i.test(notes || "")
}

export function isCollectionsStudent(student: Student) {
  if (isSubscriberStudent(student)) return false
  return student.enrollmentStatus === "collections" || student.enrollmentStatus === "cancelling"
}

export function isSubscriberStudent(student: Student) {
  return isActiveSubscriber(student)
}

/** Academy roster only — subscribers live on Subscriptions. */
export function isAcademyTalent(student: Student) {
  if (isContact(student) || isSubscriberStudent(student)) return false
  return student.program === "academy"
}

/** Overdue + declined card notes. Collections / cancelling stay out. */
export function isOverdueFollowUp(student: Student) {
  if (isContact(student) || isCollectionsStudent(student)) return false
  return (
    student.enrollmentStatus === "overdue" ||
    student.enrollmentStatus === "declined" ||
    notesSayPaymentDeclined(student.notes)
  )
}

export function isOverdueStudent(student: Student) {
  return isOverdueFollowUp(student)
}

export function isOverdueTalent(student: Student) {
  return isOverdueFollowUp(student) && !isSubscriberStudent(student)
}

export function isAcademyOverdue(student: Student) {
  return isOverdueTalent(student)
}

/** Overdue and collections both show the first missed installment. */
export function showsOverdueSince(student: Student) {
  return isCollectionsStudent(student) || isOverdueFollowUp(student)
}

/** Staff set this date on the file — keep it instead of the Square / calendar guess. */
export function deskOverdueSince(student: Pick<Student, "overdueSince" | "deskLocks">) {
  if (!student.deskLocks?.overdueSince) return ""
  return (student.overdueSince || "").slice(0, 10)
}

/** First missed installment — the date they have not paid since. */
export function overdueSinceDate(student: Student, payments: PaymentRecord[] = []) {
  const locked = deskOverdueSince(student)
  if (locked) return locked
  const today = academyDateISO()
  const missed = payments
    .filter((p) => p.studentId === student.id && p.status !== "paid" && p.status !== "scheduled")
    .map((p) => (p.dueDate || "").slice(0, 10))
    .filter((due) => due && due <= today)
    .sort()
  return missed[0] || (student.nextPaymentDate || "").slice(0, 10)
}

/** Save or clear the overdue-since date on the open file. */
export function overdueSincePatch(student: Student, date: string): Partial<Student> {
  const value = (date || "").slice(0, 10)
  if (!value) {
    return {
      overdueSince: "",
      deskLocks: { ...student.deskLocks, overdueSince: false },
    }
  }
  return {
    overdueSince: value,
    deskLocks: { ...student.deskLocks, overdueSince: true },
  }
}

export function isDeclinedStudent(student: Student) {
  return isOverdueFollowUp(student)
}

export function isCurrentlyEnrolled(student: Student) {
  if (!isAcademyTalent(student)) return false
  if (isCollectionsStudent(student) || isOverdueFollowUp(student)) return false
  if (student.enrollmentStatus === "paused" || student.enrollmentStatus === "pending") return false
  return student.enrollmentStatus === "current" || student.enrollmentStatus === "pif"
}

/** Chose the lump-sum PIF plan — not the same as tuition being paid. */
export function isPifPlan(student: Student) {
  return student.paymentPlan === "pif"
}

/** Deposit or installments still outstanding. $50-range amounts are subscriptions, not academy tuition. */
export function hasOpenAcademyTuition(student: Student) {
  const amount = student.nextPaymentAmount ?? 0
  if (student.enrollmentStatus === "pending" && amount > 0) return true
  if (isPifPlan(student)) {
    if (student.enrollmentStatus === "pif") return false
    return amount >= 75
  }
  if ((student.installmentsLeft ?? 0) > 0) return true
  return false
}

export function isSubscriberOverdue(student: Student) {
  if (!isSubscriberStudent(student)) return false
  if (student.deskLocks?.status && student.enrollmentStatus === "current") return false
  return student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined"
}

export function isPausedStudent(student: Student) {
  return isAcademyTalent(student) && student.enrollmentStatus === "paused"
}

export function isPendingStudent(student: Student) {
  return isAcademyTalent(student) && student.enrollmentStatus === "pending"
}

export function isPaidInFull(student: Student) {
  if (!isAcademyTalent(student) || !isPifPlan(student)) return false
  if (isCollectionsStudent(student) || isPausedStudent(student) || isPendingStudent(student)) return false
  if (isOverdueStudent(student)) return false
  if (hasOpenAcademyTuition(student)) return false
  const shown = displayStudentId(student.id)
  if (shown && PAID_PIF_IDS.includes(shown)) return true
  if (PAID_PIF_IDS.includes(student.id)) return true
  return PAID_PIF_NAMES.includes(foldName(`${student.firstName} ${student.lastName}`))
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
  if (student.paymentPlan === "pp") {
    if (typeof student.installmentsLeft === "number") return Math.max(0, student.installmentsLeft)
    return null
  }
  if (isPifPlan(student) || student.enrollmentStatus === "pif") {
    if (!hasOpenAcademyTuition(student)) return 0
    return typeof student.installmentsLeft === "number" ? Math.max(0, student.installmentsLeft) : 1
  }
  return null
}

export function attendanceMonthCount(records: AttendanceRecord[], studentId: string) {
  const months = new Set(
    records.filter((r) => r.studentId === studentId).map((r) => academyDateISO(r.checkedInAt).slice(0, 7)),
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
  return left != null && left > 0 && left < 3
}

export function highlightTone(student: Student): HighlightTone {
  if (student.manualHighlight && student.manualHighlight !== "none") return student.manualHighlight
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
