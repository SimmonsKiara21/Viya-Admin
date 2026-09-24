"use client"

import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui-helpers"
import { overdueSinceDate, overdueSincePatch, showsOverdueSince } from "@/lib/alerts"
import { isActiveSubscriber } from "@/lib/contacts-labels"
import { subscriberBilling } from "@/lib/subscriber-billing"
import { useStore } from "@/lib/store"
import type { Student } from "@/lib/types"

export function overdueSinceValue(student: Student, payments: Parameters<typeof subscriberBilling>[1] = []) {
  if (isActiveSubscriber(student)) {
    return subscriberBilling(student, payments).overdueSince || overdueSinceDate(student, payments)
  }
  return overdueSinceDate(student, payments)
}

export function showsOverdueSinceField(student: Student, payments: Parameters<typeof subscriberBilling>[1] = []) {
  if (student.deskLocks?.overdueSince || student.overdueSince) return true
  if (showsOverdueSince(student)) return true
  if (isActiveSubscriber(student) && subscriberBilling(student, payments).overdueSince) return true
  return false
}

export function OverdueSinceField({
  student,
  always = false,
}: {
  student: Student
  always?: boolean
}) {
  const { payments, updateStudent } = useStore()
  if (!always && !showsOverdueSinceField(student, payments)) return null
  const value = overdueSinceValue(student, payments)

  return (
    <Field label="Overdue since">
      <Input
        type="date"
        value={value}
        onChange={(e) => updateStudent(student.id, overdueSincePatch(student, e.target.value))}
      />
      {student.deskLocks?.overdueSince ? (
        <button
          type="button"
          className="mt-1 text-left text-xs text-muted-foreground underline hover:text-foreground"
          onClick={() => updateStudent(student.id, overdueSincePatch(student, ""))}
        >
          Desk date — use Square again
        </button>
      ) : null}
    </Field>
  )
}
