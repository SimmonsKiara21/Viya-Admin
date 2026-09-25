"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, NativeSelect } from "@/components/ui-helpers"
import { overdueSinceValue, showsOverdueSinceField } from "@/components/overdue-since-field"
import { HighlightPicker } from "@/components/highlight-picker"
import { DESK_STATUS_OPTIONS, ENROLLMENT_LABELS } from "@/lib/constants"
import { enrollmentTagPatch } from "@/lib/contacts-labels"
import { overdueSincePatch } from "@/lib/alerts"
import { useStore } from "@/lib/store"
import { fullName } from "@/lib/format"
import type { EnrollmentStatus, PaymentRecord, Student } from "@/lib/types"

type PersonalForm = {
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  age: string
  startDate: string
  classTime: string
  enrollmentStatus: EnrollmentStatus
  overdueSince: string
}

function fromStudent(student: Student, payments: PaymentRecord[]): PersonalForm {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    nickname: student.nickname || "",
    email: student.email || "",
    phone: student.phone || "",
    age: student.age != null ? String(student.age) : "",
    startDate: student.startDate || "",
    classTime: student.classTime || "",
    enrollmentStatus: student.enrollmentStatus === "declined" ? "overdue" : student.enrollmentStatus,
    overdueSince: overdueSinceValue(student, payments),
  }
}

function statusNeedsSince(status: EnrollmentStatus) {
  return status === "overdue" || status === "collections" || status === "cancelling" || status === "declined"
}

export function StudentProfileEdit({ student }: { student: Student }) {
  const { payments, updateStudent } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PersonalForm>(() => fromStudent(student, payments))
  const showSince =
    showsOverdueSinceField(student, payments) ||
    statusNeedsSince(form.enrollmentStatus)

  useEffect(() => {
    if (!open) return
    setForm(fromStudent(student, payments))
  }, [open, student, payments])

  function patch(next: Partial<PersonalForm>) {
    setForm((prev) => ({ ...prev, ...next }))
  }

  function save() {
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    if (!firstName || !lastName) {
      toast.error("First and last name are required.")
      return
    }
    const age = form.age.trim() === "" ? null : Number(form.age)
    if (age != null && !Number.isFinite(age)) {
      toast.error("Age must be a number.")
      return
    }
    const sinceChanged = form.overdueSince !== overdueSinceValue(student, payments)
    updateStudent(student.id, {
      ...enrollmentTagPatch(student, form.enrollmentStatus),
      ...(showSince && (sinceChanged || student.deskLocks?.overdueSince)
        ? overdueSincePatch(student, form.overdueSince)
        : {}),
      firstName,
      lastName,
      nickname: form.nickname.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      age,
      startDate: form.startDate,
      classTime: form.classTime.trim(),
    })
    toast.success(`Saved ${firstName}'s file.`)
    setOpen(false)
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit {fullName(student)}</DialogTitle>
            <DialogDescription>Name, tag status, overdue since, and contact details on this file.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={form.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
            </Field>
            <Field label="Nickname">
              <Input value={form.nickname} onChange={(e) => patch({ nickname: e.target.value })} />
            </Field>
            <Field label="Age">
              <Input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => patch({ age: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </Field>
            <Field label="Class time">
              <Input
                value={form.classTime}
                placeholder="Sat 11:00"
                onChange={(e) => patch({ classTime: e.target.value })}
              />
            </Field>
            <Field label="Highlight">
              <HighlightPicker student={student} />
            </Field>
            <Field label="Status">
              <NativeSelect
                value={form.enrollmentStatus}
                onChange={(e) => patch({ enrollmentStatus: e.target.value as EnrollmentStatus })}
              >
                {DESK_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {ENROLLMENT_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {showSince ? (
              <Field label="Overdue since">
                <Input
                  type="date"
                  value={form.overdueSince}
                  onChange={(e) => patch({ overdueSince: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
