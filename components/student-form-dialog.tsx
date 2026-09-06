"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, NativeSelect } from "@/components/ui-helpers"
import { DocusignFields, withDocusignDefaults } from "@/components/docusign-fields"
import { LabelsEditor } from "@/components/labels-editor"
import { useStore } from "@/lib/store"
import { newId } from "@/lib/format"
import { DESK_STATUS_OPTIONS, ENROLLMENT_LABELS } from "@/lib/constants"
import type {
  EnrollmentStatus,
  PaymentPlan,
  Student,
} from "@/lib/types"

type AddKind = "academy" | "modeling" | "acting" | "subscriber" | "prospect"

function applyKind(kind: AddKind): Partial<Student> {
  if (kind === "subscriber") {
    return { program: "subscriber", track: "none", paymentPlan: "subscription" }
  }
  if (kind === "prospect") {
    return {
      program: "prospect",
      track: "none",
      paymentPlan: "none",
      enrollmentStatus: "contact",
      contactCategory: "",
    }
  }
  if (kind === "modeling") {
    return { program: "academy", track: "modeling", paymentPlan: "pp" }
  }
  if (kind === "acting") {
    return { program: "academy", track: "acting", paymentPlan: "pp" }
  }
  return { program: "academy", track: "academy", paymentPlan: "pp" }
}

function kindOf(student: Student): AddKind {
  if (student.program === "subscriber") return "subscriber"
  if (student.program === "prospect") return "prospect"
  if (student.track === "modeling") return "modeling"
  if (student.track === "acting") return "acting"
  return "academy"
}

const blank = (): Student => ({
  id: "",
  firstName: "",
  lastName: "",
  nickname: "",
  email: "",
  phone: "",
  age: null,
  program: "academy",
  track: "academy",
  paymentPlan: "pp",
  enrollmentStatus: "pending",
  startDate: "",
  nextPaymentDate: "",
  nextPaymentAmount: 104,
  installmentsLeft: null,
  notes: "",
  subscriptionStatus: "none",
  photoshootStatus: "none",
  photoshootNotes: "",
  labels: [],
  removedLabels: [],
  deskLocks: {},
  contactCategory: "",
  classTime: "",
  photoUrl: "",
  docusignStatus: "none",
  docusignUrl: "",
  docusignEnvelopeId: "",
  docusignDocument: "Enrollment agreement",
  docusignSentAt: "",
  docusignSignedAt: "",
  docusignNotes: "",
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

  function patch(next: Partial<Student>) {
    setForm((prev) => ({ ...prev, ...next }))
  }

  function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required.")
      return
    }
    const id = form.id.trim() || newId("VA").replace("VA-", "").toUpperCase()
    if (students.some((s) => s.id === id)) {
      toast.error("That talent ID is already in use.")
      return
    }
    const student = withDocusignDefaults({
      ...form,
      id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
    })
    addStudent(student)
    toast.success(
      student.docusignUrl || student.docusignEnvelopeId
        ? `${student.firstName} ${student.lastName} was added with their DocuSign.`
        : `${student.firstName} ${student.lastName} was added.`,
    )
    setForm(blank())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Add talent</DialogTitle>
          <DialogDescription>Name, status, tags, and DocuSign.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input
              value={form.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
            />
          </Field>
          <Field label="Last name">
            <Input
              value={form.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
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
        </div>
        <div className="rounded-2xl border border-[oklch(0.78_0.08_85/0.35)] bg-[oklch(0.78_0.08_85/0.08)] p-4">
          <p className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
            Their DocuSign
          </p>
          <DocusignFields value={form} onChange={patch} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Talent ID">
            <Input
              placeholder="Auto if blank"
              value={form.id}
              onChange={(e) => patch({ id: e.target.value })}
            />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              value={form.age ?? ""}
              onChange={(e) => patch({ age: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label="Program">
            <NativeSelect
              value={kindOf(form)}
              onChange={(e) => patch(applyKind(e.target.value as AddKind))}
            >
              <option value="academy">Academy</option>
              <option value="modeling">Modeling</option>
              <option value="acting">Acting</option>
              <option value="subscriber">Subscriber</option>
              <option value="prospect">Prospect</option>
            </NativeSelect>
          </Field>
          <Field label="Status">
            <NativeSelect
              value={form.enrollmentStatus === "declined" ? "overdue" : form.enrollmentStatus}
              onChange={(e) => patch({ enrollmentStatus: e.target.value as EnrollmentStatus })}
            >
              {DESK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {ENROLLMENT_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Plan">
            <NativeSelect
              value={form.paymentPlan}
              onChange={(e) => patch({ paymentPlan: e.target.value as PaymentPlan })}
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
              onChange={(e) => patch({ startDate: e.target.value })}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
          <Field label="Tags" className="sm:col-span-2">
            <LabelsEditor labels={form.labels} onChange={(labels) => patch({ labels })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
