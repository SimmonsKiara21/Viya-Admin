"use client"

import { memo } from "react"
import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { ContactLabelBadge, DocusignBadge, EnrollmentBadge, ProgramBadge } from "@/components/status-badge"
import { formatDate, formatMoney, formatPhone, fullName } from "@/lib/format"
import { highlightTone, isContact, remainingPayments, type HighlightTone } from "@/lib/alerts"
import { uniqueContactLabels } from "@/lib/contacts-labels"
import type { Student } from "@/lib/types"
import { cn } from "@/lib/utils"

const ROW: Record<Exclude<HighlightTone, "none">, string> = {
  overdue: "bg-rose-500/12 ring-1 ring-rose-400/35 hover:bg-rose-500/18",
  subscriberOverdue: "bg-orange-500/14 ring-1 ring-orange-400/40 hover:bg-orange-500/20",
  collections: "bg-amber-500/14 ring-1 ring-amber-400/40 hover:bg-amber-500/20",
  paused: "bg-violet-500/12 ring-1 ring-violet-400/35 hover:bg-violet-500/18",
  pending: "bg-sky-500/12 ring-1 ring-sky-400/35 hover:bg-sky-500/18",
  finishing: "bg-lime-500/16 ring-1 ring-lime-400/45 hover:bg-lime-500/22",
  pif: "bg-emerald-500/14 ring-1 ring-emerald-400/40 hover:bg-emerald-500/20",
}

const NAME: Record<Exclude<HighlightTone, "none">, string> = {
  overdue: "text-rose-800 dark:text-rose-200",
  subscriberOverdue: "text-orange-900 dark:text-orange-100",
  collections: "text-amber-900 dark:text-amber-200",
  paused: "text-violet-900 dark:text-violet-200",
  pending: "text-sky-900 dark:text-sky-200",
  finishing: "text-lime-800 dark:text-lime-100",
  pif: "text-emerald-900 dark:text-emerald-100",
}

function detail(student: Student, tone: HighlightTone, left: number | null) {
  if (tone === "overdue" || tone === "subscriberOverdue" || tone === "collections") {
    return ` · due ${formatDate(student.nextPaymentDate)} · ${formatMoney(student.nextPaymentAmount)}`
  }
  if (tone === "finishing") return ` · ${left} payment${left === 1 ? "" : "s"} left`
  if (tone === "paused") return " · not on the floor"
  if (tone === "pending") {
    return student.startDate ? ` · start ${formatDate(student.startDate)}` : " · start date not set"
  }
  if (tone === "pif") return student.startDate ? ` · started ${formatDate(student.startDate)}` : ""
  return student.phone ? "" : ` · ${student.email || ""}`
}

export const StudentRow = memo(function StudentRow({
  student,
  context = "roster",
}: {
  student: Student
  context?: "roster" | "contacts"
}) {
  const tone = highlightTone(student)
  const left = remainingPayments(student)
  const labels = uniqueContactLabels(student)
  const contact = isContact(student)
  const showProgram = student.track === "modeling" || student.track === "acting"
  const showWrapUp = context === "roster" && tone === "finishing"
  const showEnrollment =
    context === "roster" && !contact && student.enrollmentStatus !== "contact" && !showWrapUp
  const showCurrentStudent = context === "contacts" && !contact

  return (
    <Link
      href={`/students/${student.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors",
        tone === "none" || context === "contacts" ? "hover:bg-muted/60" : ROW[tone],
      )}
    >
      <StudentPhoto student={student} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] leading-tight font-medium", context === "roster" && tone !== "none" && NAME[tone])}>
          {fullName(student)}
        </p>
        <p className="truncate text-[13px] leading-snug text-muted-foreground">
          #{student.id}
          {student.phone ? ` · ${formatPhone(student.phone)}` : ""}
          {context === "roster" ? detail(student, tone, left) : ""}
        </p>
        {context === "roster" && labels.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {labels.map((label) => (
              <ContactLabelBadge key={label} label={label} />
            ))}
          </div>
        ) : null}
        {context === "contacts" && contact && labels.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {labels.map((label) => (
              <ContactLabelBadge key={label} label={label} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {showCurrentStudent ? (
          <span className="inline-flex h-5 items-center rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 text-[11px] font-medium leading-none text-emerald-800 dark:text-emerald-200">
            Current Student
          </span>
        ) : null}
        {showProgram ? <ProgramBadge program={student.program} track={student.track} /> : null}
        {showEnrollment ? (
          <EnrollmentBadge
            status={student.enrollmentStatus === "pif" || student.paymentPlan === "pif" ? "pif" : student.enrollmentStatus}
            subscriber={student.program === "subscriber" || student.paymentPlan === "subscription"}
          />
        ) : null}
        {showWrapUp ? (
          <span className="inline-flex h-5 items-center rounded-full bg-lime-500/25 px-2 text-[11px] leading-none font-semibold text-lime-900 dark:text-lime-100">
            Wrapping up
          </span>
        ) : null}
        {context === "roster" ? <DocusignBadge status={student.docusignStatus} /> : null}
      </div>
    </Link>
  )
})
