import type { NotifyGroup, PaymentRecord, Student, SystemGroupKey } from "./types"
import { isAcademyOverdue, isCurrentlyEnrolled, isSubscriberOverdue } from "./alerts"
import { hasContactLabel } from "./contacts-labels"

export const SYSTEM_GROUP_DEFS: { systemKey: SystemGroupKey; name: string; description: string }[] = [
  {
    systemKey: "current",
    name: "Current talent",
    description: "Academy talent whose enrollment is current.",
  },
  {
    systemKey: "overdue",
    name: "Overdue",
    description: "Academy talent who are overdue, including declined cards.",
  },
  {
    systemKey: "subscriberOverdue",
    name: "Sub overdue",
    description: "Subscribers who are overdue.",
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
      .filter(isCurrentlyEnrolled)
      .map((s) => s.id)
  }
  if (key === "overdue") {
    return students.filter(isAcademyOverdue).map((s) => s.id)
  }
  if (key === "subscriberOverdue") {
    const fromStatus = students.filter(isSubscriberOverdue).map((s) => s.id)
    const fromPay = payments
      .filter((p) => p.status === "overdue" && p.itemKind === "subscriber")
      .map((p) => p.studentId)
    return [...new Set([...fromStatus, ...fromPay])]
  }
  return students
    .filter(
      (s) =>
        s.program === "subscriber" ||
        s.subscriptionStatus === "active" ||
        hasContactLabel(s, /active subscriber/i),
    )
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
