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
import { Field } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { fullName } from "@/lib/format"
import type { Student } from "@/lib/types"

type PersonalForm = {
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  age: string
  startDate: string
  classTime: string
}

function fromStudent(student: Student): PersonalForm {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    nickname: student.nickname || "",
    email: student.email || "",
    phone: student.phone || "",
    age: student.age != null ? String(student.age) : "",
    startDate: student.startDate || "",
    classTime: student.classTime || "",
  }
}

export function StudentProfileEdit({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PersonalForm>(() => fromStudent(student))

  useEffect(() => {
    if (!open) return
    setForm(fromStudent(student))
  }, [open, student])

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
    updateStudent(student.id, {
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
            <DialogDescription>Name, age, and contact details on this file.</DialogDescription>
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
