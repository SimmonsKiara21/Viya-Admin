import type { Student } from "./types"

export function foldName(value: string) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[-]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function matchStudentByName(name: string, students: Student[]): Student | undefined {
  const needle = foldName(name)
  if (!needle) return undefined
  const parts = needle.split(" ")
  const first = parts[0]
  const last = parts[parts.length - 1]
  const rest = parts.slice(1).join(" ")

  const exact: Student[] = []
  const loose: Student[] = []
  for (const student of students) {
    const full = foldName(`${student.firstName} ${student.lastName}`)
    const nick = foldName(`${student.nickname} ${student.lastName}`).trim()
    const sf = foldName(student.firstName)
    const sl = foldName(student.lastName)
    if (full === needle || (nick && nick === needle)) {
      exact.push(student)
      continue
    }
    if (sf === first && (sl === rest || sl === last || sl.endsWith(last) || sl.split(" ").includes(last))) {
      loose.push(student)
    }
  }
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return exact[0]
  if (loose.length === 1) return loose[0]
  if (loose.length > 1) {
    const tighter = loose.filter((s) => foldName(s.lastName) === rest)
    if (tighter.length === 1) return tighter[0]
  }
  return undefined
}
