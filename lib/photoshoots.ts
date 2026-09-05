import type { Photoshoot, PhotoshootPlacement, PhotoshootStatus, Student } from "./types"
import { newId } from "./format"
import { hasContactLabel } from "./contacts-labels"

export const PHOTO_COLUMNS: Exclude<PhotoshootStatus, "none">[] = [
  "scheduled",
  "headshots",
  "full",
  "refresh",
  "received",
]

export const DEFAULT_PHOTO_SHOOTS: Photoshoot[] = [
  { id: "2026-05", label: "May photoshoot", archived: false },
  { id: "la-model-source-2026", label: "LA Model Source 2026", archived: false },
  { id: "model-source-nov-2026", label: "Model Source November", archived: false },
  { id: "2026-06", label: "June 2026", archived: true },
  { id: "2026-07", label: "July 2026", archived: true },
  { id: "2026-08", label: "August 2026", archived: true },
  { id: "2026-09", label: "September 2026", archived: false },
  { id: "2026-10", label: "October 2026", archived: false },
]

const LABEL_SHOOTS: { id: string; label: string; archived: boolean; match: RegExp }[] = [
  { id: "2026-05", label: "May photoshoot", archived: false, match: /may photoshoot/i },
  { id: "la-model-source-2026", label: "LA Model Source 2026", archived: false, match: /la model source/i },
  { id: "model-source-nov-2026", label: "Model Source November", archived: false, match: /model source november/i },
]

export function shootForNotes(notes: string) {
  if (/model source november/i.test(notes)) return "model-source-nov-2026"
  if (/la model source/i.test(notes)) return "la-model-source-2026"
  if (/may photoshoot/i.test(notes)) return "2026-05"
  if (/august/i.test(notes)) return "2026-08"
  if (/july/i.test(notes)) return "2026-07"
  if (/june/i.test(notes)) return "2026-06"
  return "2026-05"
}

export function mergePhotoshoots(existing?: Photoshoot[]) {
  const byId = new Map((existing?.length ? existing : DEFAULT_PHOTO_SHOOTS).map((s) => [s.id, { ...s }]))
  for (const shoot of DEFAULT_PHOTO_SHOOTS) {
    const prev = byId.get(shoot.id)
    if (!prev) {
      byId.set(shoot.id, { ...shoot })
      continue
    }
    if (LABEL_SHOOTS.some((row) => row.id === shoot.id)) {
      byId.set(shoot.id, { ...prev, label: shoot.label, archived: shoot.archived })
    }
  }
  const order = DEFAULT_PHOTO_SHOOTS.map((s) => s.id)
  return [...byId.values()].sort((a, b) => {
    const ai = order.indexOf(a.id)
    const bi = order.indexOf(b.id)
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.id.localeCompare(b.id)
  })
}

export function mergeLabelPlacements(existing: PhotoshootPlacement[], students: Student[]) {
  const next = existing.map((row) => ({ ...row }))
  const have = new Set(next.map((row) => `${row.shootId}:${row.studentId}`))
  for (const student of students) {
    for (const shoot of LABEL_SHOOTS) {
      if (!hasContactLabel(student, shoot.match)) continue
      const key = `${shoot.id}:${student.id}`
      if (have.has(key)) continue
      next.push({
        id: `psp-label-${student.id}-${shoot.id}`,
        shootId: shoot.id,
        studentId: student.id,
        status: student.photoshootStatus && student.photoshootStatus !== "none" ? student.photoshootStatus : "received",
      })
      have.add(key)
    }
  }
  return next
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
