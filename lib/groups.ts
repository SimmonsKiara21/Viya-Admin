import type { NotifyGroup, PaymentRecord, Student, SystemGroupKey } from "./types"

export const SYSTEM_GROUP_DEFS: { systemKey: SystemGroupKey; name: string; description: string }[] = [
  {
    systemKey: "current",
    name: "Current students",
    description: "Academy students whose enrollment is current.",
  },
  {
    systemKey: "overdue",
    name: "Overdue students",
    description: "Overdue, declined, or collections on the workbook, plus open Square overdue invoices.",
  },
  {
    systemKey: "subscribers",
    name: "Subscribers",
    description: "Active subscribers and anyone on the subscriber program.",
  },
]

export function studentIdsForSystemGroup(
  key: SystemGroupKey,
  students: Student[],
  payments: PaymentRecord[],
): string[] {
  if (key === "current") {
    return students
      .filter((s) => s.enrollmentStatus === "current" && s.program === "academy")
      .map((s) => s.id)
  }
  if (key === "overdue") {
    const fromStatus = students
      .filter((s) => ["overdue", "declined", "collections"].includes(s.enrollmentStatus))
      .map((s) => s.id)
    const fromPay = payments.filter((p) => p.status === "overdue").map((p) => p.studentId)
    return [...new Set([...fromStatus, ...fromPay])]
  }
  return students
    .filter((s) => s.program === "subscriber" || s.subscriptionStatus === "active")
    .map((s) => s.id)
}

export function systemGroups(students: Student[], payments: PaymentRecord[]): NotifyGroup[] {
  return SYSTEM_GROUP_DEFS.map((def) => ({
    id: `group-${def.systemKey}`,
    name: def.name,
    kind: "system" as const,
    systemKey: def.systemKey,
    studentIds: studentIdsForSystemGroup(def.systemKey, students, payments),
    createdAt: "",
  }))
}

export function allNotifyGroups(
  students: Student[],
  payments: PaymentRecord[],
  custom: NotifyGroup[],
): NotifyGroup[] {
  return [...systemGroups(students, payments), ...custom.filter((g) => g.kind === "custom")]
}
