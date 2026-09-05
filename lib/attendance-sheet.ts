import type { JotformCheckIn } from "./jotform"
import { ATTENDANCE_SHEET_GID, ATTENDANCE_SHEET_URL } from "./constants"

function sheetUrl(base: string, gid: string) {
  const url = new URL(base)
  url.searchParams.set("output", "csv")
  url.searchParams.set("gid", gid)
  return url.toString()
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

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (!part) return part
      if (part === part.toUpperCase() || part === part.toLowerCase()) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      }
      return part
    })
    .join(" ")
}

function classFromStatus(value: string): JotformCheckIn["classType"] {
  const key = value.trim().toLowerCase()
  if (key.includes("act")) return "acting"
  if (key.includes("sub")) return "subscriber"
  return "modeling"
}

/** Tracker stamps are Arizona wall time, e.g. 8/26/2026 18:54:14 */
export function parseTrackerStamp(value: string) {
  const raw = value.trim()
  if (!raw) return ""
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return ""
  const month = match[1].padStart(2, "0")
  const day = match[2].padStart(2, "0")
  const year = match[3]
  const hour = (match[4] || "12").padStart(2, "0")
  const minute = (match[5] || "00").padStart(2, "0")
  const second = (match[6] || "00").padStart(2, "0")
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-07:00`).toISOString()
}

export function parseAttendanceCsv(text: string): JotformCheckIn[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1
  const dateI = idx(["date", "submission date", "created", "timestamp"])
  const firstI = idx(["first name", "firstname", "first"])
  const lastI = idx(["last name", "lastname", "last"])
  const phoneI = idx(["phone number", "phone", "number", "mobile"])
  const statusI = idx(["status", "class", "your status"])
  const idI = idx(["submissionid", "submission id", "id"])
  const notesI = idx(["notes", "note", "comments"])
  const rows: JotformCheckIn[] = []
  const seen = new Set<string>()

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const firstName = titleCase(firstI >= 0 ? cols[firstI] || "" : "")
    const lastName = titleCase(lastI >= 0 ? cols[lastI] || "" : "")
    const phone = (phoneI >= 0 ? cols[phoneI] || "" : "").trim()
    if (!firstName && !lastName && !phone) continue
    const statusLabel = (statusI >= 0 ? cols[statusI] || "" : "").trim() || "Modeling"
    const submissionId = (idI >= 0 ? cols[idI] || "" : "").trim()
    const checkedInAt = parseTrackerStamp(dateI >= 0 ? cols[dateI] || "" : "")
    if (!checkedInAt) continue
    const id = submissionId ? `jotform-${submissionId}` : `sheet-${firstName}-${lastName}-${checkedInAt}`
    if (seen.has(id)) continue
    seen.add(id)
    rows.push({
      id,
      firstName,
      lastName,
      phone,
      classType: classFromStatus(statusLabel),
      checkedInAt,
      statusLabel,
      notes: (notesI >= 0 ? cols[notesI] || "" : "").trim(),
    })
  }
  return rows
}

export async function pullAttendanceSheet(
  baseUrl = process.env.ATTENDANCE_SHEET_URL || ATTENDANCE_SHEET_URL,
  gid = ATTENDANCE_SHEET_GID,
): Promise<JotformCheckIn[]> {
  const res = await fetch(sheetUrl(baseUrl, gid), {
    cache: "no-store",
    headers: { "User-Agent": "ViyaAdminDesk/1.0" },
  })
  if (!res.ok) throw new Error(`Attendance sheet ${res.status}`)
  return parseAttendanceCsv(await res.text())
}
