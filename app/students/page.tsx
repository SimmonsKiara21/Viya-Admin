"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState, PageHeader } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { StudentFormDialog } from "@/components/student-form-dialog"
import { EnrollmentSyncCard } from "@/components/enrollment-sync-card"
import { useStore } from "@/lib/store"
import { isContact } from "@/lib/alerts"
import { matchesQuery } from "@/lib/format"
import { ENROLLMENT_LABELS, TRACK_LABELS, PROGRAM_LABELS } from "@/lib/constants"
import type { EnrollmentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUSES: Array<EnrollmentStatus | "all"> = [
  "all",
  "current",
  "pending",
  "declined",
  "pif",
  "overdue",
  "paused",
  "collections",
]

const PROGRAMS: Array<"all" | "academy" | "modeling" | "acting" | "subscriber"> = [
  "all",
  "academy",
  "modeling",
  "acting",
  "subscriber",
]

export default function StudentsPage() {
  const { students } = useStore()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<EnrollmentStatus | "all">("all")
  const [program, setProgram] = useState<(typeof PROGRAMS)[number]>("all")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    return students
      .filter((s) => !isContact(s))
      .filter((s) => matchesQuery(s, query))
      .filter((s) => {
        if (status === "all") return true
        if (status === "pif") return s.enrollmentStatus === "pif" || s.paymentPlan === "pif"
        return s.enrollmentStatus === status
      })
      .filter((s) => {
        if (program === "all") return true
        if (program === "modeling") return s.track === "modeling"
        if (program === "acting") return s.track === "acting"
        if (program === "academy") {
          return s.program === "academy" && s.track !== "modeling" && s.track !== "acting"
        }
        return s.program === program
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
  }, [students, query, status, program])

  return (
    <div>
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description="Current enrollment only — academy, modeling, acting, and subscribers. Pending here is only people the enrollment workbook marks pending. People from the Google Contacts export who are not on this workbook live on Contacts, in their list."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add student
          </Button>
        }
      />

      <EnrollmentSyncCard />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter this list by name, ID, phone, or email"
          className="h-11 max-w-xl rounded-full px-4"
        />
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p) => (
            <Chip key={p} active={program === p} onClick={() => setProgram(p)}>
              {p === "all" ? "All programs" : p === "modeling" || p === "acting" ? TRACK_LABELS[p] : PROGRAM_LABELS[p]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "All statuses" : ENROLLMENT_LABELS[s]}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No one matches those filters"
          description="Clear the search or switch status. You can also add a student who is not on the workbook yet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            {filtered.length} student{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y divide-border px-2 py-1">
            {filtered.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </div>
        </div>
      )}

      <StudentFormDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/16 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
