import type { Photoshoot, PhotoshootPlacement, PhotoshootStatus, Student } from "./types"
import { newId } from "./format"

export const PHOTO_COLUMNS: Exclude<PhotoshootStatus, "none">[] = [
  "scheduled",
  "headshots",
  "full",
  "refresh",
  "received",
]

export const DEFAULT_PHOTO_SHOOTS: Photoshoot[] = [
  { id: "2026-05", label: "May 2026", archived: true },
  { id: "2026-06", label: "June 2026", archived: true },
  { id: "2026-07", label: "July 2026", archived: true },
  { id: "2026-08", label: "August 2026", archived: true },
  { id: "2026-09", label: "September 2026", archived: false },
  { id: "2026-10", label: "October 2026", archived: false },
]

export function shootForNotes(notes: string) {
  if (/august/i.test(notes)) return "2026-08"
  if (/july/i.test(notes)) return "2026-07"
  if (/june/i.test(notes)) return "2026-06"
  return "2026-05"
}

export function mergePhotoshoots(existing?: Photoshoot[]) {
  const list = existing?.length ? [...existing] : [...DEFAULT_PHOTO_SHOOTS]
  const ids = new Set(list.map((s) => s.id))
  for (const shoot of DEFAULT_PHOTO_SHOOTS) {
    if (!ids.has(shoot.id)) list.push(shoot)
  }
  return list.sort((a, b) => a.id.localeCompare(b.id))
}

export function placementsFromStudents(students: Student[]): PhotoshootPlacement[] {
  const rows: PhotoshootPlacement[] = []
  let n = 1
  for (const student of students) {
    if (!student.photoshootStatus || student.photoshootStatus === "none") continue
    rows.push({
      id: `psp-${String(n).padStart(4, "0")}`,
      shootId: shootForNotes(student.photoshootNotes || ""),
      studentId: student.id,
      status: student.photoshootStatus,
    })
    n += 1
  }
  return rows
}

export function nextShootId(existing: Photoshoot[]) {
  const months = existing
    .map((s) => s.id)
    .filter((id) => /^\d{4}-\d{2}$/.test(id))
    .sort()
  const last = months[months.length - 1] || "2026-10"
  const [y, m] = last.split("-").map(Number)
  const date = new Date(y, m - 1 + 1, 1)
  const id = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date)
  return { id, label }
}

export function newPlacement(
  shootId: string,
  studentId: string,
  status: Exclude<PhotoshootStatus, "none">,
): PhotoshootPlacement {
  return { id: newId("psp"), shootId, studentId, status }
}
