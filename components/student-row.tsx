"use client"

import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { DocusignBadge, EnrollmentBadge, ProgramBadge } from "@/components/status-badge"
import { formatDate, formatMoney, formatPhone, fullName } from "@/lib/format"
import { highlightTone, remainingPayments, type HighlightTone } from "@/lib/alerts"
import { useStore } from "@/lib/store"
import type { Student } from "@/lib/types"
import { cn } from "@/lib/utils"

const ROW: Record<Exclude<HighlightTone, "none">, string> = {
  overdue: "bg-rose-500/12 ring-1 ring-rose-400/35 hover:bg-rose-500/18",
  collections: "bg-amber-500/14 ring-1 ring-amber-400/40 hover:bg-amber-500/20",
  paused: "bg-violet-500/12 ring-1 ring-violet-400/35 hover:bg-violet-500/18",
  pending: "bg-sky-500/12 ring-1 ring-sky-400/35 hover:bg-sky-500/18",
  finishing: "bg-teal-500/12 ring-1 ring-teal-400/35 hover:bg-teal-500/18",
}

const NAME: Record<Exclude<HighlightTone, "none">, string> = {
  overdue: "text-rose-800 dark:text-rose-200 sepia:text-rose-200",
  collections: "text-amber-900 dark:text-amber-200 sepia:text-amber-200",
  paused: "text-violet-900 dark:text-violet-200 sepia:text-violet-200",
  pending: "text-sky-900 dark:text-sky-200 sepia:text-sky-200",
  finishing: "text-teal-800 dark:text-teal-200 sepia:text-teal-200",
}

const PILL: Record<Exclude<HighlightTone, "none">, { className: string; label: string }> = {
  overdue: {
    label: "Overdue",
    className:
      "rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 uppercase dark:text-rose-100 sepia:text-rose-100",
  },
  collections: {
    label: "Collections",
    className:
      "rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:text-amber-100 sepia:text-amber-100",
  },
  paused: {
    label: "Paused",
    className:
      "rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-900 uppercase dark:text-violet-100 sepia:text-violet-100",
  },
  pending: {
    label: "Pending",
    className:
      "rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-900 uppercase dark:text-sky-100 sepia:text-sky-100",
  },
  finishing: {
    label: "Wrapping up",
    className:
      "rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-teal-800 uppercase dark:text-teal-100 sepia:text-teal-100",
  },
}

function detail(student: Student, tone: HighlightTone, left: number | null) {
  if (tone === "overdue" || tone === "collections") {
    return ` · due ${formatDate(student.nextPaymentDate)} · ${formatMoney(student.nextPaymentAmount)}`
  }
  if (tone === "finishing") return ` · ${left} payment${left === 1 ? "" : "s"} left`
  if (tone === "paused") return " · paused — not on the floor"
  if (tone === "pending") {
    return student.startDate ? ` · start ${formatDate(student.startDate)}` : " · pending start"
  }
  return ` · ${student.email || "no email"}`
}

export function StudentRow({ student }: { student: Student }) {
  const { attendance } = useStore()
  const tone = highlightTone(student, attendance)
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
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {pill ? <span className={pill.className}>{pill.label}</span> : null}
        <ProgramBadge program={student.program} />
        <EnrollmentBadge status={student.enrollmentStatus} />
        <DocusignBadge status={student.docusignStatus} />
      </div>
    </Link>
  )
}
