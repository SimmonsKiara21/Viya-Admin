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
  const names = [
    foldName(`${row.firstName} ${row.lastName}`),
    foldName(`${row.nickname || ""} ${row.lastName}`),
  ]
  for (const name of names) {
    if (name) BY_NAME[name] = row.url
  }
}

export function drivePhotoUrl(studentId: string): string {
  return BY_ID[studentId] || ""
}

function rosterPhotoUrl(student: Pick<Student, "id" | "firstName" | "lastName" | "nickname" | "photoUrl">) {
  return (
    BY_ID[student.id] ||
    BY_NAME[foldName(`${student.firstName} ${student.lastName}`)] ||
    BY_NAME[foldName(`${student.nickname} ${student.lastName}`)] ||
    ""
  )
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
    if (!shouldReplacePhoto(student.photoUrl, url)) return student
    changed = true
    return { ...student, photoUrl: url }
  })
  return changed ? next : students
}
