"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui-helpers"
import { DESK_STATUS_OPTIONS, ENROLLMENT_LABELS, GOOGLE_CONTACT_TAGS } from "@/lib/constants"
import { categoryFromLabels, hasGoogleTag, sameGoogleTag } from "@/lib/contacts-labels"
import { isContact } from "@/lib/alerts"
import { useStore } from "@/lib/store"
import type { EnrollmentStatus, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

function applyGoogleTags(nextLabels: string[]): Partial<Student> {
  return {
    labels: nextLabels,
    contactCategory: categoryFromLabels(nextLabels),
  }
}

export function ContactTagEditor({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  const [editing, setEditing] = useState(false)

  function toggle(tag: string) {
    const labels = student.labels || []
    const next = hasGoogleTag(labels, tag)
      ? labels.filter((label) => !sameGoogleTag(label, tag))
      : [...labels, tag]
    updateStudent(student.id, applyGoogleTags(next))
  }

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setEditing(true)}>
        <Pencil className="size-3" />
        Edit
      </Button>
    )
  }

  return (
    <div className="flex max-w-xl flex-wrap items-center gap-1.5">
      {GOOGLE_CONTACT_TAGS.map((tag) => {
        const on = hasGoogleTag(student.labels, tag.label)
        return (
          <button
            key={tag.category}
            type="button"
            onClick={() => toggle(tag.label)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              on
                ? "border-primary/50 bg-primary/16 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {tag.label}
          </button>
        )
      })}
      <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(false)}>
        Done
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
  return <ContactTagEditor student={student} />
}
