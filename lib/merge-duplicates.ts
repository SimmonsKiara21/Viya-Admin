import { foldName } from "./match-name"
import { phoneDigits } from "./jotform"
import type { AppData, Student } from "./types"

function tokensOf(student: Student) {
  return new Set(
    foldName(`${student.firstName} ${student.nickname} ${student.lastName}`)
      .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
      .split(" ")
      .filter((part) => part && part !== "jr" && part !== "sr"),
  )
}

function lastTokens(student: Student) {
  return foldName(student.lastName)
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .split(" ")
    .filter(Boolean)
}

function firstTokens(student: Student) {
  return foldName(`${student.firstName} ${student.nickname}`)
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .split(" ")
    .filter(Boolean)
}

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size < 2 || a.size !== b.size) return false
  for (const value of a) if (!b.has(value)) return false
  return true
}

function lastCompatible(a: Student, b: Student) {
  const left = lastTokens(a)
  const right = lastTokens(b)
  if (!left.length || !right.length) return false
  return left.some((x) => right.some((y) => x === y || (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x)))))
}

function firstCompatible(a: Student, b: Student) {
  const left = firstTokens(a)
  const right = firstTokens(b)
  if (!left.length || !right.length) return false
  return left.some((x) =>
    right.some(
      (y) =>
        x === y ||
        (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x))),
    ),
  )
}

function sameEmail(a: Student, b: Student) {
  const left = a.email.trim().toLowerCase()
  const right = b.email.trim().toLowerCase()
  return Boolean(left && left === right)
}

function samePhone(a: Student, b: Student) {
  const left = phoneDigits(a.phone)
  const right = phoneDigits(b.phone)
  return left.length === 10 && left === right
}

function closeFirstNames(a: Student, b: Student) {
  const left = firstTokens(a)[0] || ""
  const right = firstTokens(b)[0] || ""
  if (!left || !right || left[0] !== right[0]) return false
  return Math.abs(left.length - right.length) <= 2
}

export function samePerson(a: Student, b: Student) {
  if (a.id === b.id) return true
  if (setsEqual(tokensOf(a), tokensOf(b))) return true
  const contact = sameEmail(a, b) || samePhone(a, b)
  if (!contact || !lastCompatible(a, b)) return false
  if (firstCompatible(a, b)) return true
  return sameEmail(a, b) && samePhone(a, b) && closeFirstNames(a, b)
}

function keepScore(student: Student) {
  let score = 0
  if (student.program !== "prospect" && student.enrollmentStatus !== "contact") score += 100
  if (student.program === "subscriber" || student.paymentPlan === "subscription") score += 40
  if (student.program === "academy") score += 20
  if (!student.id.startsWith("GC") && !student.id.startsWith("PS")) score += 15
  if (student.email) score += 2
  if (student.phone) score += 2
  if (student.photoUrl) score += 3
  if ((student.labels || []).length) score += 1
  return score
}

function pickKeeper(group: Student[]) {
  return [...group].sort((a, b) => keepScore(b) - keepScore(a) || a.id.localeCompare(b.id))[0]
}

function mergeStudent(keeper: Student, extra: Student): Student {
  const labels = [...new Set([...(keeper.labels || []), ...(extra.labels || [])])]
  const removed = [...new Set([...(keeper.removedLabels || []), ...(extra.removedLabels || [])])]
  const notes =
    extra.notes && extra.notes !== keeper.notes && !keeper.notes.includes(extra.notes)
      ? [keeper.notes, extra.notes].filter(Boolean).join("\n")
      : keeper.notes
  return {
    ...keeper,
    nickname: keeper.nickname || extra.nickname,
    email: keeper.email || extra.email,
    phone: keeper.phone || extra.phone,
    age: keeper.age ?? extra.age,
    startDate: keeper.startDate || extra.startDate,
    nextPaymentDate: keeper.nextPaymentDate || extra.nextPaymentDate,
    nextPaymentAmount: keeper.nextPaymentAmount ?? extra.nextPaymentAmount,
    notes,
    labels,
    removedLabels: removed,
    photoUrl: keeper.photoUrl || extra.photoUrl,
    classTime: keeper.classTime || extra.classTime,
    docusignStatus: keeper.docusignStatus !== "none" ? keeper.docusignStatus : extra.docusignStatus,
    docusignUrl: keeper.docusignUrl || extra.docusignUrl,
    docusignEnvelopeId: keeper.docusignEnvelopeId || extra.docusignEnvelopeId,
    photoshootStatus: keeper.photoshootStatus !== "none" ? keeper.photoshootStatus : extra.photoshootStatus,
    photoshootNotes: keeper.photoshootNotes || extra.photoshootNotes,
  }
}

function remapId(value: string, aliases: Map<string, string>) {
  return aliases.get(value) || value
}

export function mergeDuplicateStudents(data: AppData): AppData {
  const students = data.students.map((student) => ({ ...student }))
  const parent = students.map((_, i) => i)
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i])
    return parent[i]
  }
  const union = (i: number, j: number) => {
    const a = find(i)
    const b = find(j)
    if (a !== b) parent[b] = a
  }

  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      if (samePerson(students[i], students[j])) union(i, j)
    }
  }

  const groups = new Map<number, Student[]>()
  for (let i = 0; i < students.length; i++) {
    const root = find(i)
    const list = groups.get(root) || []
    list.push(students[i])
    groups.set(root, list)
  }

  const aliases = new Map<string, string>()
  const nextStudents: Student[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      nextStudents.push(group[0])
      continue
    }
    const keeper = pickKeeper(group)
    let merged = keeper
    for (const extra of group) {
      if (extra.id === keeper.id) continue
      merged = mergeStudent(merged, extra)
      aliases.set(extra.id, keeper.id)
    }
    nextStudents.push(merged)
  }

  if (!aliases.size) return data

  return {
    ...data,
    students: nextStudents,
    attendance: data.attendance.map((row) => ({ ...row, studentId: remapId(row.studentId, aliases) })),
    feedback: data.feedback.map((row) => ({ ...row, studentId: remapId(row.studentId, aliases) })),
    payments: data.payments.map((row) => ({ ...row, studentId: remapId(row.studentId, aliases) })),
    photoshootPlacements: data.photoshootPlacements.map((row) => ({
      ...row,
      studentId: remapId(row.studentId, aliases),
    })),
    groups: data.groups.map((group) => ({
      ...group,
      studentIds: [...new Set(group.studentIds.map((id) => remapId(id, aliases)))],
    })),
  }
}
