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
  "enrollmentStatus",
  "notes",
  "nextPaymentDate",
  "nextPaymentAmount",
  "installmentsLeft",
  "classTime",
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
    const keepNames = sameNameTokens(
      `${existing.firstName} ${existing.lastName}`,
      `${row.firstName} ${row.lastName}`,
    )
    for (const field of WORKBOOK_FIELDS) {
      if (keepNames && (field === "firstName" || field === "lastName")) continue
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

const CURRENT_HEADERS =
  "STUDENT ID,PAYMENT PLAN,STATUS,NAME,,,PAYMNETS LEFT,AGE,NUMBER,EMAIL,START DATE,NOTES"

export function parseEnrollmentCsv(text: string, defaults: Partial<Student> = {}): Partial<Student>[] {
  const prepared = withWorkbookHeaders(text)
  const lines = prepared.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1
  const firstI = idx(["first name", "firstname", "first"])
  const lastI = idx(["last name", "lastname", "last"])
  const nameI = idx(["name", "student name", "full name"])
  const emailI = idx(["email", "e-mail", "e-mail 1 - value"])
  const phoneI = idx(["phone", "phone number", "mobile", "cell", "number", "phone 1 - value"])
  const idI = idx(["id", "student id", "studentid"])
  const startI = idx(["start date", "start", "startdate"])
  const statusI = idx(["status", "enrollment", "enrollment status"])
  const planI = idx(["payment plan", "plan", "paymentplan"])
  const notesI = idx(["notes", "note", "comments"])
  const dueI = idx(["next payment", "next payment date", "due date", "due", "deposit date"])
  const amountI = idx(["amount", "next payment amount", "balance", "due amount", "deposit"])
  const programI = idx(["program", "type"])
  const trackI = idx(["track", "focus"])
  const nickI = idx(["nickname", "preferred name", "preferred"])
  const ageI = idx(["age"])
  const classI = idx(["class time", "classtime", "class"])
  const leftI = idx(["payments left", "paymnets left", "remaining payments", "installments left"])
  const photoI = idx(["photoshoot recieved", "photoshoot received", "photoshoot"])
  const rows: Partial<Student>[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    let firstName = (firstI >= 0 ? cols[firstI] : "").trim()
    let lastName = (lastI >= 0 ? cols[lastI] : "").trim()
    let nickname = (nickI >= 0 ? cols[nickI] : "").trim()
    if (!firstName && !lastName && nameI >= 0) {
      const split = splitFullName(cols[nameI] || "")
      firstName = split.firstName
      lastName = split.lastName
      nickname = nickname || split.nickname
    }
    if (!firstName && !lastName) continue
    const notes = (notesI >= 0 ? cols[notesI] : "").trim()
    const dueFromNotes = parseDueFromNotes(notes)
    const amountRaw = amountI >= 0 ? cols[amountI] : ""
    const amount = Number(String(amountRaw || "").replace(/[^0-9.]/g, ""))
    const leftRaw = leftI >= 0 ? String(cols[leftI] || "").trim() : ""
    const left = /^\d+$/.test(leftRaw) ? Number(leftRaw) : null
    const ageRaw = ageI >= 0 ? String(cols[ageI] || "").trim() : ""
    const age = /^\d{1,2}$/.test(ageRaw) ? Number(ageRaw) : null
    const photo = photoI >= 0 ? String(cols[photoI] || "").toLowerCase() : ""
    rows.push({
      id: (idI >= 0 ? cols[idI] : "").trim(),
      firstName,
      lastName,
      nickname,
      email: (emailI >= 0 ? cols[emailI] : "").trim(),
      phone: (phoneI >= 0 ? cols[phoneI] : "").trim(),
      age,
      startDate: normalizeDate(startI >= 0 ? cols[startI] : ""),
      enrollmentStatus: mapStatus(statusI >= 0 ? cols[statusI] : "") || defaults.enrollmentStatus,
      paymentPlan: mapPlan(planI >= 0 ? cols[planI] : "") || defaults.paymentPlan,
      notes,
      nextPaymentDate: normalizeDate(dueI >= 0 ? cols[dueI] : "") || dueFromNotes.date,
      nextPaymentAmount:
        Number.isFinite(amount) && amount > 0 ? amount : dueFromNotes.amount,
      installmentsLeft: left,
      program: mapProgram(programI >= 0 ? cols[programI] : "") || defaults.program,
      track: mapTrack(trackI >= 0 ? cols[trackI] : "") || defaults.track,
      classTime: (classI >= 0 ? cols[classI] : "").trim(),
      photoshootStatus: /full|received|yes|head/.test(photo) ? "received" : undefined,
    })
  }
  return rows.map(markPaidInFull)
}

/** Workbook STATUS often stays Current; PAYMENT PLAN = PIF is the paid-in-full marker. */
export function markPaidInFull<T extends Partial<Student>>(row: T): T {
  if (row.paymentPlan !== "pif") return row
  if (row.enrollmentStatus && row.enrollmentStatus !== "current") return row
  return { ...row, enrollmentStatus: "pif" }
}

export function applyWorkbookRows(base: Student[], rows: Partial<Student>[]): {
  students: Student[]
  added: number
  updated: number
} {
  const students = base.map((s) => ({ ...s }))
  const byId = new Map(students.map((s) => [s.id, s]))
  let added = 0
  let updated = 0
  for (const row of rows) {
    const existing =
      (row.id && byId.get(row.id)) ||
      students.find(
        (s) => foldName(`${s.firstName} ${s.lastName}`) === foldName(`${row.firstName || ""} ${row.lastName || ""}`),
      )
    if (existing) {
      let changed = false
      const keepNames = sameNameTokens(
        `${existing.firstName} ${existing.lastName}`,
        `${row.firstName || ""} ${row.lastName || ""}`,
      )
      for (const field of WORKBOOK_FIELDS) {
        if (keepNames && (field === "firstName" || field === "lastName")) continue
        const value = row[field]
        if (value === undefined || value === "" || value === null) continue
        if (existing[field] !== value) {
          ;(existing as Student)[field] = value as never
          changed = true
        }
      }
      if (changed) updated += 1
      continue
    }
    const created = studentFromCsvRow(row)
    if (!created) continue
    students.unshift(created)
    byId.set(created.id, created)
    added += 1
  }
  return { students, added, updated }
}

export function enrollmentFingerprint(students: Student[]) {
  return students
    .map(
      (s) =>
        `${s.id}:${s.firstName}:${s.lastName}:${s.email}:${s.phone}:${s.startDate}:${s.enrollmentStatus}:${s.paymentPlan}:${s.nextPaymentDate}:${s.nextPaymentAmount}`,
    )
    .sort()
    .join("|")
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
    nickname: row.nickname || "",
    email: row.email || "",
    phone: row.phone || "",
    age: row.age ?? null,
    program: row.program || "academy",
    track: row.track || (row.program === "subscriber" ? "none" : "academy"),
    paymentPlan: row.paymentPlan || "pp",
    enrollmentStatus: row.enrollmentStatus || "pending",
    startDate: row.startDate || "",
    nextPaymentDate: row.nextPaymentDate || "",
    nextPaymentAmount: row.nextPaymentAmount ?? null,
    installmentsLeft: row.installmentsLeft ?? null,
    notes: row.notes || "",
    contactCategory: "",
    subscriptionStatus: "none",
    photoshootStatus: row.photoshootStatus || "none",
    photoshootNotes: "",
    classTime: row.classTime || "",
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

function mapPlan(value: string): Student["paymentPlan"] | undefined {
  const key = value.trim().toLowerCase()
  if (!key) return undefined
  if (key.includes("sub")) return "subscription"
  if (key.includes("pif") || key.includes("paid in full") || key === "paid") return "pif"
  if (key.includes("pp") || key.includes("plan") || key.includes("install")) return "pp"
  return undefined
}

function mapProgram(value: string): Student["program"] | undefined {
  const key = value.trim().toLowerCase()
  if (!key) return undefined
  if (key.includes("sub")) return "subscriber"
  if (key.includes("prospect") || key.includes("contact")) return "prospect"
  if (key.includes("academy") || key.includes("model") || key.includes("act")) return "academy"
  return undefined
}

function mapTrack(value: string): Student["track"] | undefined {
  const key = value.trim().toLowerCase()
  if (!key) return undefined
  if (key.includes("model")) return "modeling"
  if (key.includes("act")) return "acting"
  if (key.includes("academy")) return "academy"
  return undefined
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

function withWorkbookHeaders(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || ""
  const firstCell = splitCsvLine(firstLine)[0]?.trim() || ""
  if (/^\d+$/.test(firstCell)) return `${CURRENT_HEADERS}\n${text}`
  return text
}

function splitFullName(value: string) {
  let nickname = ""
  let cleaned = value.replace(/\s*\((male|female)\)\s*/gi, " ").replace(/\s+/g, " ").trim()
  const nick = cleaned.match(/\(([^)]+)\)/)
  if (nick) {
    nickname = titleCaseName(nick[1].trim())
    cleaned = cleaned.replace(nick[0], " ").replace(/\s+/g, " ").trim()
  }
  if (cleaned.includes(",")) {
    const [last, ...rest] = cleaned.split(",").map((part) => part.trim()).filter(Boolean)
    return { firstName: titleCaseName(rest.join(" ")), lastName: titleCaseName(last), nickname }
  }
  const parts = cleaned.split(" ").filter(Boolean)
  if (!parts.length) return { firstName: "", lastName: "", nickname }
  if (parts.length === 1) return { firstName: titleCaseName(parts[0]), lastName: "", nickname }
  return {
    firstName: titleCaseName(parts.slice(0, -1).join(" ")),
    lastName: titleCaseName(parts[parts.length - 1]),
    nickname,
  }
}

function titleCaseName(value: string) {
  return value
    .split(" ")
    .map((part) => {
      if (!part) return part
      if (part === part.toUpperCase() || part === part.toLowerCase()) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      }
      return part
    })
    .join(" ")
}

function sameNameTokens(a: string, b: string) {
  const left = new Set(foldName(a).split(" ").filter(Boolean))
  const right = new Set(foldName(b).split(" ").filter(Boolean))
  if (!left.size || left.size !== right.size) return false
  for (const token of left) if (!right.has(token)) return false
  return true
}

function parseDueFromNotes(notes: string) {
  const matches = [
    ...notes.matchAll(/\$?\s*(\d+(?:\.\d{1,2})?)\s+(?:due(?:\s+on)?)\s+(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)/gi),
  ]
  if (!matches.length) return { date: "", amount: null as number | null }
  const parsed = matches
    .map((m) => ({ amount: Number(m[1]), date: normalizeDate(m[2]) }))
    .filter((row) => row.date && Number.isFinite(row.amount))
    .sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = parsed.find((row) => row.date >= "2026-08-29") ?? parsed[parsed.length - 1]
  return upcoming ? { date: upcoming.date, amount: upcoming.amount } : { date: "", amount: null }
}

function normalizeDate(value: string) {
  const raw = value.trim()
  if (!raw) return ""
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const dashed = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (dashed) {
    const month = dashed[1].padStart(2, "0")
    const day = dashed[2].padStart(2, "0")
    const year = dashed[3].length === 2 ? `20${dashed[3]}` : dashed[3]
    return `${year}-${month}-${day}`
  }
  const mixed = raw.match(/^(\d{1,2})[\/-](\d{1,2})-(\d{4})$/)
  if (mixed) {
    return `${mixed[3]}-${mixed[1].padStart(2, "0")}-${mixed[2].padStart(2, "0")}`
  }
  const monthDay = raw.match(/^(\d{1,2})[\/-](\d{1,2})$/)
  if (monthDay) {
    return `2026-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`
  }
  return ""
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
