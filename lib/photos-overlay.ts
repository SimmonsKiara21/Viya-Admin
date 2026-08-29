import rosterPhotos from "@/data/photos.json"
import type { Student } from "./types"

const DRIVE_PHOTOS = rosterPhotos as Record<string, string>

export function drivePhotoUrl(studentId: string): string {
  return DRIVE_PHOTOS[studentId] || ""
}

/** Fill empty portraits from matched Season 1–5 Drive folders. Never replaces a staff upload. */
export function applyDrivePhotos(students: Student[]): Student[] {
  let changed = false
  const next = students.map((student) => {
    if (student.photoUrl) return student
    const url = DRIVE_PHOTOS[student.id]
    if (!url) return student
    changed = true
    return { ...student, photoUrl: url }
  })
  return changed ? next : students
}
