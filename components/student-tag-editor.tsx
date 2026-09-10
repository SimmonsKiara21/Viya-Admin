"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui-helpers"
import { DESK_STATUS_OPTIONS, ENROLLMENT_LABELS, GOOGLE_CONTACT_TAGS } from "@/lib/constants"
import { categoryFromLabels, hasGoogleTag, isNewsletterRecipient, sameGoogleTag } from "@/lib/contacts-labels"
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

export function toggleStudentList(student: Student, tag: string): Partial<Student> {
  const labels = student.labels || []
  const removed = student.removedLabels || []
  const on = sameGoogleTag(tag, "Newsletter") ? isNewsletterRecipient(student) : hasGoogleTag(labels, tag)
  if (on) {
    return {
      ...applyGoogleTags(labels.filter((label) => !sameGoogleTag(label, tag))),
      removedLabels: removed.some((label) => sameGoogleTag(label, tag)) ? removed : [...removed, tag],
    }
  }
  return {
    ...applyGoogleTags([...labels, tag]),
    removedLabels: removed.filter((label) => !sameGoogleTag(label, tag)),
  }
}

export function ContactTagEditor({
  student,
  alwaysOpen = false,
}: {
  student: Student
  alwaysOpen?: boolean
}) {
  const { updateStudent } = useStore()
  const [editing, setEditing] = useState(alwaysOpen)

  function toggle(tag: string) {
    updateStudent(student.id, toggleStudentList(student, tag))
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
        const on = tag.category === "newsletter" ? isNewsletterRecipient(student) : hasGoogleTag(student.labels, tag.label)
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
      {alwaysOpen ? null : (
        <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(false)}>
          Done
        </Button>
      )}
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
  return <ContactTagEditor student={student} alwaysOpen />
}
