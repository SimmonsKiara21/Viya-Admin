"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui-helpers"
import { DESK_STATUS_OPTIONS, ENROLLMENT_LABELS, GOOGLE_CONTACT_TAGS } from "@/lib/constants"
import { hasGoogleTag, isNewsletterRecipient, toggleStudentList } from "@/lib/contacts-labels"
import { isContact } from "@/lib/alerts"
import { useStore } from "@/lib/store"
import type { EnrollmentStatus, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

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

export function NewsletterPanel({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  const onList = isNewsletterRecipient(student)

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-heading text-xl">Newsletter</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          People on this list appear on Contacts → Newsletter. Subscribers are included until you take them off. Add
          anyone else you want on the send list.
        </p>
      </div>
      <p className="text-sm">
        {onList ? `${student.firstName} is on the newsletter.` : `${student.firstName} is not on the newsletter.`}
      </p>
      <div>
        <Button
          type="button"
          variant={onList ? "outline" : "default"}
          onClick={() => updateStudent(student.id, toggleStudentList(student, "Newsletter"))}
        >
          {onList ? "Remove from newsletter" : "Add to newsletter"}
        </Button>
      </div>
    </div>
  )
}
