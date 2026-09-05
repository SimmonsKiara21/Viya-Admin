import type { AttendanceRecord, ClassType, Student } from "./types"
import { JOTFORM_ATTENDANCE_ID } from "./constants"

export type JotformCheckIn = {
  id: string
  firstName: string
  lastName: string
  phone: string
  classType: ClassType
  checkedInAt: string
  statusLabel: string
  notes?: string
}

export type JotformMatchResult = {
  records: AttendanceRecord[]
  unmatched: JotformCheckIn[]
}

const CLASS_FROM_STATUS: Record<string, ClassType> = {
  modeling: "modeling",
  acting: "acting",
  subscriber: "subscriber",
}

export function phoneDigits(value: string) {
  const digits = (value || "").replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return digits.slice(-10)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

function nameFrom(value: unknown): { firstName: string; lastName: string } {
  const row = asRecord(value)
  if (row) {
    const firstName = pickString(row.first, row.firstName, row["First Name"])
    const lastName = pickString(row.last, row.lastName, row["Last Name"])
    if (firstName || lastName) return { firstName, lastName }
    const pretty = pickString(row.prettyFormat, row.full, row.text)
    if (pretty) return splitName(pretty)
  }
  return splitName(pickString(value))
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function phoneFrom(value: unknown): string {
  const row = asRecord(value)
  if (row) {
    return pickString(row.full, row.phone, row.number, row.prettyFormat, row.area && row.phone ? `(${row.area}) ${row.phone}` : "")
  }
  return pickString(value)
}

function classFromStatus(value: unknown): { classType: ClassType; statusLabel: string } {
  const label = pickString(asRecord(value)?.text, asRecord(value)?.answer, value)
  const key = label.toLowerCase()
  return { classType: CLASS_FROM_STATUS[key] || "modeling", statusLabel: label || "Modeling" }
}

function parseTimestamp(value: unknown) {
  const raw = pickString(value).replace(" ", "T")
  if (!raw) return new Date().toISOString()
  const date = /[zZ]|[+-]\d{2}:\d{2}$/.test(raw)
    ? new Date(raw)
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)
      ? new Date(`${raw.slice(0, 19)}-07:00`)
      : new Date(raw)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function lookup(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in source && source[key] != null && source[key] !== "") return source[key]
  }
  const lower = Object.fromEntries(Object.entries(source).map(([k, v]) => [k.toLowerCase(), v]))
  for (const key of keys) {
    const hit = lower[key.toLowerCase()]
    if (hit != null && hit !== "") return hit
  }
  return undefined
}

function flattenAnswers(answers: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const row = asRecord(answers)
  if (!row) return out
  for (const [key, value] of Object.entries(row)) {
    out[key] = value
    const nested = asRecord(value)
    if (!nested) continue
    if ("answer" in nested) out[key] = nested.answer
    if (typeof nested.name === "string") out[nested.name] = nested.answer ?? nested
    if (typeof nested.text === "string") out[nested.text] = nested.answer ?? nested
  }
  return out
}

export function parseJotformPayload(raw: unknown, fallbackId?: string): JotformCheckIn | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  let pretty = root
  const prettyRaw = root.pretty
  if (typeof prettyRaw === "string") {
    try {
      pretty = { ...root, ...(JSON.parse(prettyRaw) as Record<string, unknown>) }
    } catch {
      pretty = root
    }
  } else if (asRecord(prettyRaw)) {
    pretty = { ...root, ...asRecord(prettyRaw) }
  }

  if (typeof root.rawRequest === "string") {
    try {
      pretty = { ...pretty, ...(JSON.parse(root.rawRequest) as Record<string, unknown>) }
    } catch {
      /* ignore */
    }
  }

  const answers = flattenAnswers(pretty.answers ?? pretty)
  const merged = { ...pretty, ...answers }

  const name = nameFrom(
    lookup(merged, "q2_fullname0", "q2_q2_fullname0", "2", "fullName", "fullname", "q2_fullname0[first]") ??
      {
        first: lookup(merged, "q2_fullname0[first]", "q2_q2_fullname0[first]", "first_2", "firstName"),
        last: lookup(merged, "q2_fullname0[last]", "q2_q2_fullname0[last]", "last_2", "lastName"),
      },
  )
  const firstName = name.firstName || pickString(lookup(merged, "q2_fullname0[first]", "q2_q2_fullname0[first]", "firstName"))
  const lastName = name.lastName || pickString(lookup(merged, "q2_fullname0[last]", "q2_q2_fullname0[last]", "lastName"))
  const phone = phoneFrom(
    lookup(merged, "q4_phone2", "q4_q4_phone2", "4", "phone", "q4_phone2[full]", "q4_q4_phone2[full]", "input_4_full"),
  )
  const status = classFromStatus(lookup(merged, "q5_radio3", "q5_q5_radio3", "5", "status", "Your Status"))

  if (!firstName && !lastName && !phone) return null

  const id =
    pickString(pretty.submissionID, pretty.submission_id, pretty.id, pretty.sid, fallbackId) ||
    `jotform-${phoneDigits(phone) || firstName}-${parseTimestamp(pretty.created_at || pretty.createdAt || pretty.submitDate)}`

  return {
    id: id.startsWith("jotform-") ? id : `jotform-${id}`,
    firstName,
    lastName,
    phone,
    classType: status.classType,
    checkedInAt: parseTimestamp(pretty.created_at || pretty.createdAt || pretty.submitDate || pretty.updated_at),
    statusLabel: status.statusLabel,
  }
}

export function parseJotformList(raw: unknown): JotformCheckIn[] {
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.content)
      ? (asRecord(raw)!.content as unknown[])
      : Array.isArray(asRecord(raw)?.submissions)
        ? (asRecord(raw)!.submissions as unknown[])
        : Array.isArray(asRecord(raw)?.checkIns)
          ? (asRecord(raw)!.checkIns as unknown[])
          : raw
            ? [raw]
            : []

  const seen = new Set<string>()
  const out: JotformCheckIn[] = []
  for (const row of rows) {
    const parsed = parseJotformPayload(row)
    if (!parsed || seen.has(parsed.id)) continue
    seen.add(parsed.id)
    out.push(parsed)
  }
  return out
}

export function matchJotformCheckIns(checkIns: JotformCheckIn[], students: Student[]): JotformMatchResult {
  const records: AttendanceRecord[] = []
  const unmatched: JotformCheckIn[] = []

  for (const row of checkIns) {
    const student = matchStudent(row, students)
    if (!student) {
      unmatched.push(row)
      continue
    }
    records.push({
      id: row.id,
      studentId: student.id,
      checkedInAt: row.checkedInAt,
      classType: row.classType,
      notes: row.notes?.trim() || "Tracker check-in",
    })
  }

  return { records, unmatched }
}

function matchStudent(row: JotformCheckIn, students: Student[]) {
  const digits = phoneDigits(row.phone)
  if (digits.length === 10) {
    const byPhone = students.filter((s) => phoneDigits(s.phone) === digits)
    if (byPhone.length === 1) return byPhone[0]
    if (byPhone.length > 1) {
      const named = byPhone.find((s) => namesMatch(s, row))
      if (named) return named
    }
  }
  const named = students.filter((s) => namesMatch(s, row))
  if (named.length === 1) return named[0]
  return null
}

function namesMatch(student: Student, row: JotformCheckIn) {
  const first = row.firstName.trim().toLowerCase()
  const last = row.lastName.trim().toLowerCase()
  if (!first || !last) return false
  const studentFirst = student.firstName.trim().toLowerCase()
  const nick = student.nickname.trim().toLowerCase()
  const studentLast = student.lastName.trim().toLowerCase()
  if (studentLast !== last) return false
  if (studentFirst === first || nick === first) return true
  if (studentFirst.startsWith(first) || first.startsWith(studentFirst)) return true
  if (nick && (nick.startsWith(first) || first.startsWith(nick))) return true
  return false
}

export function isSameCheckIn(a: AttendanceRecord, b: AttendanceRecord) {
  if (a.id === b.id) return true
  if (a.studentId !== b.studentId || a.classType !== b.classType) return false
  const left = Date.parse(a.checkedInAt)
  const right = Date.parse(b.checkedInAt)
  if (Number.isNaN(left) || Number.isNaN(right)) return false
  return Math.abs(left - right) < 3 * 60 * 1000
}

export function mergeAttendance(existing: AttendanceRecord[], incoming: AttendanceRecord[]) {
  const next = [...existing]
  for (const row of incoming) {
    if (next.some((item) => isSameCheckIn(item, row))) continue
    next.unshift(row)
  }
  return next
}

export const JOTFORM_FIELD = {
  formId: JOTFORM_ATTENDANCE_ID,
  first: "q2_q2_fullname0[first]",
  last: "q2_q2_fullname0[last]",
  phone: "q4_q4_phone2[full]",
  status: "q5_q5_radio3",
} as const
