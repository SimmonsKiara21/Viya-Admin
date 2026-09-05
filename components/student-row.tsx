"use client"

import { memo } from "react"
import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { ContactLabelBadge, DocusignBadge, EnrollmentBadge, ProgramBadge } from "@/components/status-badge"
import { formatDate, formatMoney, formatPhone, fullName } from "@/lib/format"
import { highlightTone, notesSayPaymentDeclined, remainingPayments, type HighlightTone } from "@/lib/alerts"
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

const PILL: Record<Exclude<HighlightTone, "none">, { className: string; label: string }> = {
  overdue: {
    label: "Overdue talent",
    className:
      "rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 uppercase dark:text-rose-100",
  },
  subscriberOverdue: {
    label: "Subscriber overdue",
    className:
      "rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-orange-900 uppercase dark:text-orange-100",
  },
  collections: {
    label: "Collections",
    className:
      "rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:text-amber-100",
  },
  paused: {
    label: "Paused",
    className:
      "rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-900 uppercase dark:text-violet-100",
  },
  pending: {
    label: "Pending",
    className:
      "rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-900 uppercase dark:text-sky-100",
  },
  finishing: {
    label: "<3 payments",
    className:
      "rounded-full bg-lime-500/25 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-lime-900 uppercase dark:text-lime-100",
  },
  pif: {
    label: "Paid in full",
    className:
      "rounded-full bg-emerald-500/22 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-900 uppercase dark:text-emerald-100",
  },
}

function detail(student: Student, tone: HighlightTone, left: number | null) {
  if (tone === "overdue" || tone === "subscriberOverdue" || tone === "collections") {
    return ` · due ${formatDate(student.nextPaymentDate)} · ${formatMoney(student.nextPaymentAmount)}`
  }
  if (tone === "finishing") return ` · ${left} payment${left === 1 ? "" : "s"} left`
  if (tone === "paused") return " · paused — not on the floor"
  if (tone === "pending") {
    return student.startDate ? ` · start ${formatDate(student.startDate)}` : " · pending start"
  }
  if (tone === "pif") return " · paid in full"
  return ` · ${student.email || "no email"}`
}

export const StudentRow = memo(function StudentRow({ student }: { student: Student }) {
  const tone = highlightTone(student)
  const left = remainingPayments(student)
  const pill = tone === "none" ? null : PILL[tone]

  return (
    <Link
      href={`/students/${student.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors",
        tone === "none" ? "hover:bg-muted/60" : ROW[tone],
      )}
    >
      <StudentPhoto student={student} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", tone !== "none" && NAME[tone])}>
          {fullName(student)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          #{student.id} · {formatPhone(student.phone)}
          {detail(student, tone, left)}
        </p>
        {student.labels?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {student.labels.map((label) => (
              <ContactLabelBadge key={label} label={label} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {pill ? <span className={pill.className}>{pill.label}</span> : null}
        {notesSayPaymentDeclined(student.notes) ? (
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 uppercase dark:text-rose-100">
            Payment declined
          </span>
        ) : null}
        <ProgramBadge program={student.program} track={student.track} />
        <EnrollmentBadge
          status={student.enrollmentStatus}
          subscriber={student.program === "subscriber" || student.paymentPlan === "subscription"}
        />
        <DocusignBadge status={student.docusignStatus} />
      </div>
    </Link>
  )
})
