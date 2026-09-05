import type { Student } from "./types"
import { foldName } from "./match-name"
import { phoneDigits } from "./jotform"
import { CONTACTS_LABELS_URL } from "./constants"

const SKIP_LABELS = new Set(["newsletter", "* mycontacts", "mycontacts"])

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

function cleanLabels(raw: string) {
  return raw
    .split(":::")
    .map((part) => part.trim())
    .filter((part) => part && !SKIP_LABELS.has(part.toLowerCase()))
}

function firstValue(raw: string) {
  return raw.split(":::").map((part) => part.trim()).find(Boolean) || ""
}

export function displayContactLabel(label: string) {
  const key = label.trim()
  if (/^current student$/i.test(key)) return "Current Student"
  if (/^active subscribers$/i.test(key)) return "Active Subscribers"
  if (/may photoshoot/i.test(key)) return "May photoshoot"
  if (/model source november/i.test(key)) return "Model Source November"
  if (/la model source/i.test(key)) return "LA Model Source 2026"
  return key
}

export type ContactLabelRow = {
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  labels: string[]
}

export function parseContactsLabelsCsv(text: string): ContactLabelRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1
  const firstI = idx(["first name", "firstname", "first"])
  const lastI = idx(["last name", "lastname", "last"])
  const nickI = idx(["nickname", "preferred name"])
  const emailI = idx(["e-mail 1 - value", "email 1 - value", "email", "e-mail"])
  const phoneI = idx(["phone 1 - value", "phone", "phone number"])
  const labelsI = idx(["labels", "label"])
  const rows: ContactLabelRow[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const firstName = (firstI >= 0 ? cols[firstI] : "").trim()
    const lastName = (lastI >= 0 ? cols[lastI] : "").trim()
    const labels = cleanLabels(labelsI >= 0 ? cols[labelsI] || "" : "")
    if ((!firstName && !lastName) || !labels.length) continue
    rows.push({
      firstName,
      lastName,
      nickname: (nickI >= 0 ? cols[nickI] : "").trim(),
      email: firstValue(emailI >= 0 ? cols[emailI] || "" : ""),
      phone: firstValue(phoneI >= 0 ? cols[phoneI] || "" : ""),
      labels,
    })
  }
  return rows
}

function matchRow(row: ContactLabelRow, students: Student[]) {
  const email = row.email.toLowerCase()
  if (email) {
    const hit = students.find((s) => s.email.toLowerCase() === email)
    if (hit) return hit
  }
  const digits = phoneDigits(row.phone)
  if (digits.length === 10) {
    const hits = students.filter((s) => phoneDigits(s.phone) === digits)
    if (hits.length === 1) return hits[0]
  }
  const name = foldName(`${row.firstName} ${row.lastName}`)
  const nick = foldName(`${row.nickname} ${row.lastName}`)
  return students.find((s) => {
    const full = foldName(`${s.firstName} ${s.lastName}`)
    const alias = foldName(`${s.nickname} ${s.lastName}`)
    return full === name || (nick && alias === nick) || (s.nickname && foldName(`${s.nickname} ${s.lastName}`) === name)
  })
}

function applyLabelEffects(student: Student, labels: string[]) {
  const text = labels.join(" | ").toLowerCase()
  if (text.includes("active subscriber") && student.subscriptionStatus !== "cancelled") {
    student.subscriptionStatus = "active"
  }
  if (/photoshoot|model source/.test(text)) {
    if (student.photoshootStatus === "none") student.photoshootStatus = "received"
    const note = labels
      .filter((label) => /photoshoot|model source/i.test(label))
      .map(displayContactLabel)
      .join(" · ")
    if (note && !student.photoshootNotes.includes(note)) {
      student.photoshootNotes = student.photoshootNotes ? `${student.photoshootNotes} · ${note}` : note
    }
  }
}

export function contactLabelsFingerprint(rows: ContactLabelRow[] | undefined) {
  return (rows ?? [])
    .map((row) => `${row.firstName}|${row.lastName}|${row.email}|${row.phone}|${row.labels.join(",")}`)
    .sort()
    .join("||")
}

export function applyContactLabels(students: Student[], rows: ContactLabelRow[]) {
  const next = students.map((s) => ({ ...s, labels: [...(s.labels || [])] }))
  const incoming = new Map<string, string[]>()
  let matched = 0
  for (const row of rows) {
    const existing = matchRow(row, next)
    if (!existing) continue
    matched += 1
    incoming.set(existing.id, [...new Set([...(incoming.get(existing.id) || []), ...row.labels])])
  }
  let updated = 0
  for (const student of next) {
    const labels = incoming.get(student.id)
    if (!labels) continue
    const merged = [...new Set(labels)].sort((a, b) =>
      displayContactLabel(a).localeCompare(displayContactLabel(b)),
    )
    const before = (student.labels || []).join("|")
    const beforeSub = student.subscriptionStatus
    const beforePhoto = student.photoshootStatus + student.photoshootNotes
    student.labels = merged
    applyLabelEffects(student, merged)
    if (
      merged.join("|") !== before ||
      student.subscriptionStatus !== beforeSub ||
      student.photoshootStatus + student.photoshootNotes !== beforePhoto
    ) {
      updated += 1
    }
  }
  return { students: next, matched, updated, unmatched: rows.length - matched }
}

export async function pullContactLabels(
  baseUrl = process.env.CONTACTS_LABELS_URL || CONTACTS_LABELS_URL,
) {
  const res = await fetch(baseUrl, {
    cache: "no-store",
    headers: { "User-Agent": "ViyaAdminDesk/1.0" },
  })
  if (!res.ok) throw new Error(`Contacts labels sheet ${res.status}`)
  return parseContactsLabelsCsv(await res.text())
}
