"use client"

import { useState } from "react"
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
import { useStore } from "@/lib/store"
import { newId } from "@/lib/format"
import type {
  EnrollmentStatus,
  PaymentPlan,
  Program,
  Student,
} from "@/lib/types"

const blank = (): Student => ({
  id: "",
  firstName: "",
  lastName: "",
  nickname: "",
  email: "",
  phone: "",
  age: null,
  program: "academy",
  paymentPlan: "pp",
  enrollmentStatus: "pending",
  startDate: "",
  nextPaymentDate: "",
  nextPaymentAmount: 104,
  notes: "",
  subscriptionStatus: "none",
  photoshootStatus: "none",
  photoshootNotes: "",
  classTime: "",
  photoUrl: "",
})

export function StudentFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addStudent, students } = useStore()
  const [form, setForm] = useState<Student>(blank)

  function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required.")
      return
    }
    const id = form.id.trim() || newId("VA").replace("VA-", "").toUpperCase()
    if (students.some((s) => s.id === id)) {
      toast.error("That student ID is already in use.")
      return
    }
    addStudent({ ...form, id, firstName: form.firstName.trim(), lastName: form.lastName.trim() })
    toast.success(`${form.firstName} ${form.lastName} was added.`)
    setForm(blank())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Add a student</DialogTitle>
          <DialogDescription>
            New talent is saved on this device. You can add a photo from their profile.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last name">
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
          <Field label="Student ID">
            <Input
              placeholder="Auto if blank"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              value={form.age ?? ""}
              onChange={(e) =>
                setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Program">
            <NativeSelect
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value as Program })}
            >
              <option value="academy">Academy</option>
              <option value="subscriber">Subscriber</option>
              <option value="prospect">Prospect</option>
            </NativeSelect>
          </Field>
          <Field label="Enrollment / payment">
            <NativeSelect
              value={form.enrollmentStatus}
              onChange={(e) =>
                setForm({ ...form, enrollmentStatus: e.target.value as EnrollmentStatus })
              }
            >
              <option value="current">Current</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
              <option value="pif">PIF / Paid in Full</option>
              <option value="overdue">Overdue</option>
              <option value="paused">Paused</option>
              <option value="collections">Collections</option>
            </NativeSelect>
          </Field>
          <Field label="Plan">
            <NativeSelect
              value={form.paymentPlan}
              onChange={(e) => setForm({ ...form, paymentPlan: e.target.value as PaymentPlan })}
            >
              <option value="pp">Payment Plan</option>
              <option value="pif">Paid in Full</option>
              <option value="subscription">Subscription</option>
              <option value="none">None</option>
            </NativeSelect>
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
