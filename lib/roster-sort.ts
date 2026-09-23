import type { Student } from "./types"

export const ROSTER_SORTS = ["az", "za", "start-new", "start-old"] as const
export type RosterSort = (typeof ROSTER_SORTS)[number]

export const ROSTER_SORT_LABELS: Record<RosterSort, string> = {
  az: "A–Z",
  za: "Z–A",
  "start-new": "Newest start",
  "start-old": "Oldest start",
}

export function isRosterSort(value: string | null | undefined): value is RosterSort {
  return Boolean(value && (ROSTER_SORTS as readonly string[]).includes(value))
}

function nameCmp(a: Student, b: Student) {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
}

export function sortStudents<T extends Student>(list: T[], sort: RosterSort): T[] {
  return [...list].sort((a, b) => {
    if (sort === "start-new" || sort === "start-old") {
      const aDate = a.startDate || ""
      const bDate = b.startDate || ""
      if (!aDate && !bDate) return nameCmp(a, b)
      if (!aDate) return 1
      if (!bDate) return -1
      const cmp = aDate.localeCompare(bDate)
      if (cmp !== 0) return sort === "start-new" ? -cmp : cmp
      return nameCmp(a, b)
    }
    const cmp = nameCmp(a, b)
    return sort === "za" ? -cmp : cmp
  })
}
