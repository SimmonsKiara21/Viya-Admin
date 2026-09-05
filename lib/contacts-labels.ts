import type { ContactCategory, Student } from "./types"
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
  const parts = raw
    .split(":::")
    .map((part) => part.trim())
    .filter((part) => part && !SKIP_LABELS.has(part.toLowerCase()))
  const meaningful = parts.filter((part) => !/^newsletter$/i.test(part))
  return meaningful.length ? meaningful : parts
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
  if (/^newsletter$/i.test(key)) return "Newsletter"
  return key
}

export type ContactLabelRow = {
  firstName: string
  lastName: string
  nickname: string
  email: string
  email2: string
  phone: string
  organization: string
  title: string
  birthday: string
  notes: string
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
  const email2I = idx(["e-mail 2 - value", "email 2 - value"])
  const phoneI = idx(["phone 1 - value", "phone", "phone number"])
  const labelsI = idx(["labels", "label"])
  const middleI = idx(["middle name", "middle"])
  const orgI = idx(["organization name", "organization"])
  const titleI = idx(["organization title", "title"])
  const notesI = idx(["notes", "note"])
  const bdayI = idx(["birthday"])
  const rows: ContactLabelRow[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const firstName = (firstI >= 0 ? cols[firstI] : "").trim()
    const middleName = (middleI >= 0 ? cols[middleI] : "").trim()
    const lastName = (lastI >= 0 ? cols[lastI] : "").trim()
    if (!firstName && !lastName) continue
    rows.push({
      firstName: [firstName, middleName].filter(Boolean).join(" "),
      lastName,
      nickname: (nickI >= 0 ? cols[nickI] : "").trim(),
      email: firstValue(emailI >= 0 ? cols[emailI] || "" : ""),
      email2: firstValue(email2I >= 0 ? cols[email2I] || "" : ""),
      phone: firstValue(phoneI >= 0 ? cols[phoneI] || "" : ""),
      organization: (orgI >= 0 ? cols[orgI] : "").trim(),
      title: (titleI >= 0 ? cols[titleI] : "").trim(),
      birthday: (bdayI >= 0 ? cols[bdayI] : "").trim(),
      notes: (notesI >= 0 ? cols[notesI] : "").trim(),
      labels: cleanLabels(labelsI >= 0 ? cols[labelsI] || "" : ""),
    })
  }
  return rows
}

function nameBits(row: ContactLabelRow) {
  const paren = row.firstName.match(/^(.+?)\s*\((.+)\)\s*$/)
  return {
    firstName: (paren ? paren[1] : row.firstName).trim(),
    nickname: (paren ? paren[2] : row.nickname).trim() || row.nickname.trim(),
    lastName: row.lastName.trim(),
  }
}

function foldPerson(first: string, last: string) {
  return foldName(`${first} ${last}`)
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function firstNamesOf(first: string, nickname: string) {
  return [first, nickname]
    .flatMap((value) => foldName(value).split(" "))
    .filter((part) => part && part !== "jr" && part !== "sr")
}

function firstCompatible(rowFirsts: string[], student: Student) {
  const theirs = firstNamesOf(student.firstName, student.nickname)
  if (!rowFirsts.length || !theirs.length) return true
  return rowFirsts.some((a) =>
    theirs.some((b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)))),
  )
}

function lastCompatible(rowLast: string, studentLast: string) {
  const a = foldPerson("", rowLast)
  const b = foldPerson("", studentLast)
  if (!a || !b) return true
  if (a === b || a.includes(b) || b.includes(a)) return true
  return false
}

function samePerson(row: ContactLabelRow, student: Student) {
  const bits = nameBits(row)
  const rowFirsts = firstNamesOf(bits.firstName, bits.nickname)
  const firstOk = firstCompatible(rowFirsts, student)
  const lastOk = lastCompatible(bits.lastName, student.lastName)
  if (firstOk && lastOk) return true
  if (!bits.firstName) {
    const token = foldPerson("", bits.lastName)
    if (token && firstNamesOf(student.firstName, student.nickname).includes(token)) return true
  }
  return false
}

function uniqueContactHit(row: ContactLabelRow, hits: Student[]) {
  const named = hits.filter((student) => samePerson(row, student))
  if (named.length === 1) return named[0]
  if (named.length === 0 && hits.length === 1 && firstCompatible(firstNamesOf(nameBits(row).firstName, nameBits(row).nickname), hits[0])) {
    return hits[0]
  }
  return undefined
}

function matchRow(row: ContactLabelRow, students: Student[]) {
  const email = row.email.toLowerCase()
  if (email) {
    const hit = uniqueContactHit(
      row,
      students.filter((s) => s.email.toLowerCase() === email),
    )
    if (hit) return hit
  }
  const digits = phoneDigits(row.phone)
  if (digits.length === 10) {
    const hit = uniqueContactHit(
      row,
      students.filter((s) => phoneDigits(s.phone) === digits),
    )
    if (hit) return hit
  }
  const bits = nameBits(row)
  const name = foldPerson(bits.firstName, bits.lastName)
  const nick = bits.nickname ? foldPerson(bits.nickname, bits.lastName) : ""
  return students.find((s) => {
    const full = foldPerson(s.firstName, s.lastName)
    const alias = s.nickname ? foldPerson(s.nickname, s.lastName) : ""
    return (
      (name && full === name) ||
      (nick && (full === nick || alias === nick)) ||
      (alias && alias === name)
    )
  })
}

export function categoryFromLabels(labels: string[]): ContactCategory {
  const text = labels.join(" | ").toLowerCase()
  if (/model source november/.test(text)) return "model-source-nov"
  if (/la model source/.test(text)) return "model-source-la"
  if (/photoshoot/.test(text)) return "photoshoot"
  if (/current student/.test(text)) return "current-student"
  if (/active subscriber/.test(text)) return "subscriber"
  if (/newsletter/.test(text)) return "newsletter"
  return "new"
}

export function hasContactLabel(student: Student, pattern: RegExp) {
  return (student.labels || []).some((label) => pattern.test(label))
}

export function onGoogleList(student: Student, filter: ContactCategory | "all") {
  if (filter === "all") return (student.labels || []).length > 0
  if (filter === "current-student") return hasContactLabel(student, /current student/i)
  if (filter === "subscriber") return hasContactLabel(student, /active subscriber/i)
  if (filter === "photoshoot") return hasContactLabel(student, /may photoshoot/i)
  if (filter === "model-source-la") return hasContactLabel(student, /la model source/i)
  if (filter === "model-source-nov") return hasContactLabel(student, /model source november/i)
  if (filter === "newsletter") return hasContactLabel(student, /newsletter/i)
  return false
}

export function matchesContactFilter(student: Student, filter: ContactCategory | "all") {
  if (onGoogleList(student, filter)) return true
  if (filter === "all") return true
  if (filter === "current-student") return student.contactCategory === "current-student"
  if (filter === "subscriber") return student.contactCategory === "subscriber"
  if (filter === "photoshoot") return student.contactCategory === "photoshoot"
  if (filter === "model-source-la") return student.contactCategory === "model-source-la"
  if (filter === "model-source-nov") return student.contactCategory === "model-source-nov"
  if (filter === "newsletter") return student.contactCategory === "newsletter"
  return student.contactCategory === filter
}

function isDeskContact(student: Student) {
  return student.program === "prospect" || student.enrollmentStatus === "contact"
}

function applyLabelEffects(student: Student, labels: string[]) {
  const text = labels.join(" | ").toLowerCase()
  if (
    !isDeskContact(student) &&
    text.includes("active subscriber") &&
    student.subscriptionStatus !== "cancelled"
  ) {
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
  if (isDeskContact(student)) {
    const nextCategory = categoryFromLabels(labels)
    const locked = student.contactCategory === "inquiry" || student.contactCategory === "follow-up" || student.contactCategory === "not-interested"
    if (!locked) student.contactCategory = nextCategory
  }
}

function contactId(row: ContactLabelRow, used: Set<string>) {
  const bits = nameBits(row)
  const slug =
    foldName(`${bits.firstName || bits.lastName} ${bits.firstName ? bits.lastName : ""}`).replace(/ /g, "") ||
    "contact"
  const base = `GC${slug.slice(0, 16)}`.toUpperCase()
  if (!used.has(base)) return base
  const extra = phoneDigits(row.phone).slice(-4) || row.email.replace(/[^a-z0-9]/gi, "").slice(0, 6)
  const next = `GC${slug.slice(0, 10)}${extra}`.toUpperCase()
  if (!used.has(next)) return next
  let i = 2
  while (used.has(`${base}${i}`)) i += 1
  return `${base}${i}`
}

function sheetNotes(row: ContactLabelRow) {
  const bits: string[] = []
  if (row.organization || row.title) {
    bits.push([row.organization, row.title].filter(Boolean).join(" · "))
  }
  if (row.email2) bits.push(`Alt email ${row.email2}`)
  if (row.birthday) bits.push(`Birthday ${row.birthday}`)
  if (row.notes) bits.push(row.notes)
  return bits.join("\n")
}

function fillContactDetails(student: Student, row: ContactLabelRow) {
  if (!student.email && row.email) student.email = row.email
  if (!student.phone && row.phone) student.phone = row.phone
  if (!student.nickname && row.nickname) student.nickname = row.nickname
  const extra = sheetNotes(row)
  if (extra && !student.notes.includes(extra.split("\n")[0] || extra)) {
    student.notes = student.notes ? `${student.notes}\n${extra}` : extra
  }
}

function contactFromRow(row: ContactLabelRow, used: Set<string>): Student {
  const bits = nameBits(row)
  const firstName = bits.firstName || bits.lastName
  const lastName = bits.firstName ? bits.lastName : ""
  const labels = [...new Set(row.labels)].sort((a, b) =>
    displayContactLabel(a).localeCompare(displayContactLabel(b)),
  )
  return {
    id: contactId(row, used),
    firstName,
    lastName,
    nickname: bits.nickname,
    email: row.email,
    phone: row.phone,
    age: null,
    program: "prospect",
    track: "none",
    paymentPlan: "none",
    enrollmentStatus: "contact",
    startDate: "",
    nextPaymentDate: "",
    nextPaymentAmount: null,
    installmentsLeft: null,
    notes: sheetNotes(row),
    contactCategory: categoryFromLabels(labels),
    subscriptionStatus: "none",
    photoshootStatus: /photoshoot|model source/i.test(labels.join(" ")) ? "received" : "none",
    photoshootNotes: labels
      .filter((label) => /photoshoot|model source/i.test(label))
      .map(displayContactLabel)
      .join(" · "),
    labels,
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

export function contactLabelsFingerprint(rows: ContactLabelRow[] | undefined) {
  return (rows ?? [])
    .map((row) => `${row.firstName}|${row.lastName}|${row.email}|${row.phone}|${row.email2 || ""}|${row.labels.join(",")}`)
    .sort()
    .join("||")
}

export function applyContactLabels(students: Student[], rows: ContactLabelRow[]) {
  const next = students.map((s) => ({ ...s, labels: [...(s.labels || [])] }))
  const used = new Set(next.map((s) => s.id))
  const incoming = new Map<string, string[]>()
  let matched = 0
  let added = 0
  for (const row of rows) {
    let existing = matchRow(row, next)
    if (!existing) {
      existing = contactFromRow(row, used)
      used.add(existing.id)
      next.push(existing)
      added += 1
    }
    matched += 1
    incoming.set(existing.id, [...new Set([...(incoming.get(existing.id) || []), ...row.labels])])
    if (isDeskContact(existing)) fillContactDetails(existing, row)
  }
  let updated = 0
  for (const student of next) {
    const labels = incoming.get(student.id)
    if (!labels?.length) continue
    const merged = [...new Set(labels.filter(Boolean))].sort((a, b) =>
      displayContactLabel(a).localeCompare(displayContactLabel(b)),
    )
    const before = (student.labels || []).join("|")
    const beforeSub = student.subscriptionStatus
    const beforePhoto = student.photoshootStatus + student.photoshootNotes
    const beforeCategory = student.contactCategory
    student.labels = merged
    applyLabelEffects(student, merged)
    if (
      merged.join("|") !== before ||
      student.subscriptionStatus !== beforeSub ||
      student.photoshootStatus + student.photoshootNotes !== beforePhoto ||
      student.contactCategory !== beforeCategory
    ) {
      updated += 1
    }
  }
  return { students: next, matched, updated, added, unmatched: Math.max(0, rows.length - matched) }
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
