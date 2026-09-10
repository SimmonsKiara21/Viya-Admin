"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui-helpers"
import { CONTACT_LABELS, DESK_STATUS_OPTIONS, ENROLLMENT_LABELS } from "@/lib/constants"
import { googleLabelForCategory } from "@/lib/contacts-labels"
import { isContact } from "@/lib/alerts"
import { useStore } from "@/lib/store"
import type { ContactCategory, EnrollmentStatus, Student } from "@/lib/types"

const TAG_OPTIONS = (Object.keys(CONTACT_LABELS) as ContactCategory[]).filter((key) => key !== "new")

function applyContactTag(student: Student, value: ContactCategory | "") {
  const google = googleLabelForCategory(value)
  const labels = [...(student.labels || [])]
  if (google && !labels.some((label) => label.toLowerCase() === google.toLowerCase())) {
    labels.push(google)
  }
  return { contactCategory: value, labels }
}

export function ContactTagEditor({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setEditing(true)}>
        <Pencil className="size-3" />
        Edit
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        className="h-8 w-[13rem] text-xs"
        autoFocus
        value={student.contactCategory || ""}
        onChange={(e) => {
          updateStudent(student.id, applyContactTag(student, e.target.value as ContactCategory | ""))
          setEditing(false)
        }}
      >
        <option value="">Choose a tag</option>
        {TAG_OPTIONS.map((key) => (
          <option key={key} value={key}>
            {CONTACT_LABELS[key]}
          </option>
        ))}
      </NativeSelect>
      <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  )
}

export function EnrollmentTagEditor({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  const [editing, setEditing] = useState(false)

  if (isContact(student)) return <ContactTagEditor student={student} />

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setEditing(true)}>
        <Pencil className="size-3" />
        Edit
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        className="h-8 w-[11rem] text-xs"
        autoFocus
        value={student.enrollmentStatus === "declined" ? "overdue" : student.enrollmentStatus}
        onChange={(e) => {
          updateStudent(student.id, { enrollmentStatus: e.target.value as EnrollmentStatus })
          setEditing(false)
        }}
      >
        {DESK_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {ENROLLMENT_LABELS[status]}
          </option>
        ))}
      </NativeSelect>
      <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  )
}

export function ProfileCategoryEditor({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  const [editing, setEditing] = useState(false)
  const hasTag = Boolean(student.contactCategory) || (student.labels || []).length > 0

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {hasTag && student.contactCategory ? (
          <span className="text-sm">{CONTACT_LABELS[student.contactCategory]}</span>
        ) : hasTag ? (
          <span className="text-sm text-muted-foreground">Tagged from Google Contacts</span>
        ) : null}
        <Button type="button" variant="outline" size="xs" onClick={() => setEditing(true)}>
          <Pencil className="size-3" />
          Edit
        </Button>
      </div>
    )
  }

  return (
    <NativeSelect
      autoFocus
      value={student.contactCategory || ""}
      onChange={(e) => {
        updateStudent(student.id, applyContactTag(student, e.target.value as ContactCategory | ""))
        setEditing(false)
      }}
      onBlur={() => setEditing(false)}
    >
      <option value="">Choose a tag</option>
      {TAG_OPTIONS.map((key) => (
        <option key={key} value={key}>
          {CONTACT_LABELS[key]}
        </option>
      ))}
    </NativeSelect>
  )
}
