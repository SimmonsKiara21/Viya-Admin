import photoIndex from "@/data/photos-index.json"
import type { Student } from "./types"
import { foldName } from "./match-name"

type PhotoRow = {
  id: string
  url: string
  firstName: string
  lastName: string
  nickname?: string
}

const ROWS = photoIndex as PhotoRow[]
const BY_ID: Record<string, string> = {}
const BY_NAME: Record<string, string> = {}

for (const row of ROWS) {
  BY_ID[row.id] = row.url
  const full = foldName(`${row.firstName} ${row.lastName}`)
  if (full) BY_NAME[full] = row.url
  if (row.nickname) {
    const nick = foldName(`${row.nickname} ${row.lastName}`)
    if (nick) BY_NAME[nick] = row.url
  }
}

export function drivePhotoUrl(studentId: string): string {
  return BY_ID[studentId] || ""
}

function rosterPhotoUrl(student: Pick<Student, "id" | "firstName" | "lastName" | "nickname" | "photoUrl">) {
  return (
    BY_ID[student.id] ||
    BY_NAME[foldName(`${student.firstName} ${student.lastName}`)] ||
    (student.nickname ? BY_NAME[foldName(`${student.nickname} ${student.lastName}`)] : "") ||
    ""
  )
}

function photoOwnerName(url: string) {
  return ROWS.find((row) => row.url === url)
}

function photoBelongsTo(
  url: string,
  student: Pick<Student, "id" | "firstName" | "lastName" | "nickname">,
) {
  const owner = photoOwnerName(url)
  if (!owner) return true
  if (owner.id === student.id) return true
  const full = foldName(`${student.firstName} ${student.lastName}`)
  if (full && full === foldName(`${owner.firstName} ${owner.lastName}`)) return true
  if (student.nickname && foldName(`${student.nickname} ${student.lastName}`) === foldName(`${owner.nickname || ""} ${owner.lastName}`)) {
    return true
  }
  return false
}

function shouldReplacePhoto(current: string, next: string) {
  if (!next || current === next) return false
  if (current.startsWith("data:")) return false
  if (!current) return true
  return current.includes("googleusercontent.com") || current.startsWith("/photos/")
}

/** Fill empty portraits from matched Season 1–5 folders. Never replaces a staff upload. */
export function applyDrivePhotos(students: Student[]): Student[] {
  let changed = false
  const next = students.map((student) => {
    const url = rosterPhotoUrl(student)
    if (student.photoUrl.startsWith("/photos/") && !photoBelongsTo(student.photoUrl, student)) {
      changed = true
      return { ...student, photoUrl: url }
    }
    if (!shouldReplacePhoto(student.photoUrl, url)) return student
    changed = true
    return { ...student, photoUrl: url }
  })
  return changed ? next : students
}
