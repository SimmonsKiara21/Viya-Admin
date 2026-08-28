import type { Student } from "./types"
import { foldName } from "./match-name"

const WORKBOOK_FIELDS = [
  "firstName",
  "lastName",
  "nickname",
  "email",
  "phone",
  "age",
  "program",
  "track",
  "paymentPlan",
  "startDate",
] as const

export function mergeEnrollmentStudents(
  current: Student[],
  workbook: Student[],
  options: { updateExisting?: boolean } = {},
): { students: Student[]; added: number; updated: number } {
  const updateExisting = Boolean(options.updateExisting)
  const next = current.map((s) => ({ ...s }))
  const byId = new Map(next.map((s) => [s.id, s]))
  let added = 0
  let updated = 0

  for (const row of workbook) {
    const existing =
      byId.get(row.id) ??
      next.find((s) => foldName(`${s.firstName} ${s.lastName}`) === foldName(`${row.firstName} ${row.lastName}`))
    if (!existing) {
      next.unshift(row)
      byId.set(row.id, row)
      added += 1
      continue
    }
    if (!updateExisting) continue
    let changed = false
    for (const field of WORKBOOK_FIELDS) {
      const value = row[field]
      if (value === undefined || value === "" || value === null) continue
      if (existing[field] !== value) {
        ;(existing as Student)[field] = value as never
        changed = true
      }
    }
    if (changed) updated += 1
  }

  return { students: next, added, updated }
}

export function parseEnrollmentCsv(text: string): Partial<Student>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1
  const firstI = idx(["first name", "firstname", "first"])
  const lastI = idx(["last name", "lastname", "last"])
  const emailI = idx(["email", "e-mail"])
  const phoneI = idx(["phone", "mobile", "cell"])
  const idI = idx(["id", "student id", "studentid"])
  const startI = idx(["start date", "start", "startdate"])
  const statusI = idx(["status", "enrollment", "enrollment status"])
  const rows: Partial<Student>[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const firstName = (firstI >= 0 ? cols[firstI] : "").trim()
    const lastName = (lastI >= 0 ? cols[lastI] : "").trim()
    if (!firstName && !lastName) continue
    rows.push({
      id: (idI >= 0 ? cols[idI] : "").trim(),
      firstName,
      lastName,
      email: (emailI >= 0 ? cols[emailI] : "").trim(),
      phone: (phoneI >= 0 ? cols[phoneI] : "").trim(),
      startDate: normalizeDate(startI >= 0 ? cols[startI] : ""),
      enrollmentStatus: mapStatus(statusI >= 0 ? cols[statusI] : ""),
    })
  }
  return rows
}

export function studentFromCsvRow(row: Partial<Student>): Student | null {
  const firstName = (row.firstName || "").trim()
  const lastName = (row.lastName || "").trim()
  if (!firstName && !lastName) return null
  const slug = foldName(`${firstName} ${lastName}`).replace(/ /g, "") || "student"
  return {
    id: (row.id || "").trim() || `ENR${slug.slice(0, 10)}`,
    firstName,
    lastName,
    nickname: "",
    email: row.email || "",
    phone: row.phone || "",
    age: row.age ?? null,
    program: row.program || "academy",
    track: row.track || "academy",
    paymentPlan: row.paymentPlan || "pp",
    enrollmentStatus: row.enrollmentStatus || "pending",
    startDate: row.startDate || "",
    nextPaymentDate: "",
    nextPaymentAmount: null,
    installmentsLeft: null,
    notes: "",
    contactCategory: "",
    subscriptionStatus: "none",
    photoshootStatus: "none",
    photoshootNotes: "",
    classTime: "",
    photoUrl: "",
    docusignStatus: "none",
    docusignUrl: "",
    docusignEnvelopeId: "",
    docusignDocument: "",
    docusignSentAt: "",
    docusignSignedAt: "",
    docusignNotes: "",
  }
}

function mapStatus(value: string): Student["enrollmentStatus"] | undefined {
  const key = value.trim().toLowerCase()
  if (!key) return undefined
  if (key.includes("overdue")) return "overdue"
  if (key.includes("declin")) return "declined"
  if (key.includes("pending")) return "pending"
  if (key.includes("pause")) return "paused"
  if (key.includes("collection")) return "collections"
  if (key.includes("pif") || key.includes("paid in full")) return "pif"
  if (key.includes("current")) return "current"
  return undefined
}

function normalizeDate(value: string) {
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!m) return ""
  const month = m[1].padStart(2, "0")
  const day = m[2].padStart(2, "0")
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${year}-${month}-${day}`
}

function splitCsvLine(line: string) {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else quoted = !quoted
      continue
    }
    if (ch === "," && !quoted) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}
