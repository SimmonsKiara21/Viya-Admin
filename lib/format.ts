import { ACADEMY_TIMEZONE } from "./constants"
import type { Student } from "./types"

function academyParts(date: Date, opts: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: ACADEMY_TIMEZONE, ...opts }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return { get, parts }
}

/** Parse a stored stamp. Naive datetimes (Jotform) are Arizona wall time. */
export function parseAcademyInstant(iso: string) {
  const raw = (iso || "").trim()
  if (!raw) return new Date(Number.NaN)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T12:00:00-07:00`)
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw)
  const naive = raw.replace(" ", "T").slice(0, 19)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(naive)) return new Date(`${naive}-07:00`)
  return new Date(raw)
}

export function academyDateISO(iso: string | Date = new Date()) {
  const date = iso instanceof Date ? iso : parseAcademyInstant(iso)
  if (Number.isNaN(date.getTime())) return ""
  const { get } = academyParts(date, { year: "numeric", month: "2-digit", day: "2-digit" })
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function fullName(student: Pick<Student, "firstName" | "lastName" | "nickname">) {
  const nick = student.nickname ? ` “${student.nickname}”` : ""
  return `${student.firstName}${nick} ${student.lastName}`.trim()
}

export function displayName(student: Pick<Student, "firstName" | "lastName" | "nickname">) {
  return student.nickname || student.firstName
}

export function initials(student: Pick<Student, "firstName" | "lastName">) {
  const a = student.firstName?.[0] ?? ""
  const b = student.lastName?.[0] ?? ""
  return (a + b).toUpperCase()
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone || "—"
}

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  return digits.length === 10 ? `tel:+1${digits}` : `tel:+${digits}`
}

export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

export function smsHref(phone: string, body?: string) {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  const num = digits.length === 10 ? `+1${digits}` : `+${digits}`
  return body ? `sms:${num}?&body=${encodeURIComponent(body)}` : `sms:${num}`
}

export function formatMoney(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—"
  const cents = Math.round(amount * 100) % 100 !== 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(iso: string | undefined) {
  if (!iso) return "—"
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split("-").map(Number)
  if (!y || !m || !day) return iso
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, day))
}

export function formatDateTime(iso: string | undefined) {
  if (!iso) return "—"
  const date = parseAcademyInstant(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ACADEMY_TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatShortDate(iso: string | undefined) {
  if (!iso) return "—"
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split("-")
  if (!y || !m || !day) return iso
  return `${m}/${day}/${y.slice(-2)}`
}

export function formatTime(iso: string | undefined) {
  if (!iso) return "—"
  const date = parseAcademyInstant(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ACADEMY_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function todayISO(date = new Date()) {
  return academyDateISO(date)
}

export function isSameDay(iso: string, day = todayISO()) {
  return academyDateISO(iso) === day
}

export function searchHaystack(student: Student) {
  return [
    student.id,
    student.firstName,
    student.lastName,
    student.nickname,
    student.email,
    student.phone,
    student.notes,
    student.docusignEnvelopeId,
    student.docusignDocument,
  ]
    .join(" ")
    .toLowerCase()
}

export function matchesQuery(student: Student, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return searchHaystack(student).includes(q)
}

export function fillTemplate(
  template: string,
  student: Student,
  extras?: { amount?: string; due?: string },
) {
  return template
    .replaceAll("{{firstName}}", displayName(student))
    .replaceAll("{{lastName}}", student.lastName)
    .replaceAll("{{fullName}}", fullName(student))
    .replaceAll("{{amount}}", extras?.amount || formatMoney(student.nextPaymentAmount))
    .replaceAll("{{due}}", extras?.due || formatDate(student.nextPaymentDate))
}

export function portraitHue(name: string) {
  let h = 0
  for (const c of name) h = (h * 33 + c.charCodeAt(0)) % 360
  return 28 + (h % 28)
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}
