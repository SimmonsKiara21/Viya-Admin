"use client"

import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { DocusignBadge, EnrollmentBadge, ProgramBadge } from "@/components/status-badge"
import { formatDate, formatMoney, formatPhone, fullName } from "@/lib/format"
import { highlightTone, remainingPayments } from "@/lib/alerts"
import { useStore } from "@/lib/store"
import type { Student } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StudentRow({ student }: { student: Student }) {
  const { attendance } = useStore()
  const tone = highlightTone(student, attendance)
  const left = remainingPayments(student)

  return (
    <Link
      href={`/students/${student.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors",
        tone === "overdue" && "bg-rose-500/12 ring-1 ring-rose-400/35 hover:bg-rose-500/18",
        tone === "finishing" && "bg-teal-500/12 ring-1 ring-teal-400/35 hover:bg-teal-500/18",
        tone === "none" && "hover:bg-muted/60",
      )}
    >
      <StudentPhoto student={student} size="sm" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium",
            tone === "overdue" && "text-rose-800 dark:text-rose-200 sepia:text-rose-200",
            tone === "finishing" && "text-teal-800 dark:text-teal-200 sepia:text-teal-200",
          )}
        >
          {fullName(student)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          #{student.id} · {formatPhone(student.phone)}
          {tone === "overdue"
            ? ` · due ${formatDate(student.nextPaymentDate)} · ${formatMoney(student.nextPaymentAmount)}`
            : tone === "finishing"
              ? ` · ${left} payment${left === 1 ? "" : "s"} left`
              : ` · ${student.email || "no email"}`}
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {tone === "overdue" ? (
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 uppercase dark:text-rose-100 sepia:text-rose-100">
            Overdue
          </span>
        ) : null}
        {tone === "finishing" ? (
          <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-teal-800 uppercase dark:text-teal-100 sepia:text-teal-100">
            Wrapping up
          </span>
        ) : null}
        <ProgramBadge program={student.program} />
        <EnrollmentBadge status={student.enrollmentStatus} />
        <DocusignBadge status={student.docusignStatus} />
      </div>
    </Link>
  )
}
