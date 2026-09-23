"use client"

import { memo } from "react"
import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { ContactLabelBadge, PlanBadge } from "@/components/status-badge"
import { formatDate, formatMoney, formatPhone, formatStudentId, fullName } from "@/lib/format"
import { toggleStudentList, uniqueContactLabels } from "@/lib/contacts-labels"
import { useStore } from "@/lib/store"
import { highlightTone, isContact, remainingPayments, type HighlightTone } from "@/lib/alerts"
import type { Student } from "@/lib/types"
import { cn } from "@/lib/utils"

const ROW: Record<Exclude<HighlightTone, "none">, string> = {
  overdue:
    "bg-rose-500/12 ring-1 ring-rose-400/35 hover:bg-rose-500/18 sepia:bg-[#e38b84] sepia:ring-2 sepia:ring-[#8b1e1e] sepia:hover:bg-[#d96f66]",
  subscriberOverdue:
    "bg-orange-500/14 ring-1 ring-orange-400/40 hover:bg-orange-500/20 sepia:bg-[#e8a05a] sepia:ring-2 sepia:ring-[#8a4b12] sepia:hover:bg-[#de8c3c]",
  collections:
    "bg-amber-500/14 ring-1 ring-amber-400/40 hover:bg-amber-500/20 sepia:bg-[#c9b48a] sepia:ring-2 sepia:ring-[#5c4a28] sepia:hover:bg-[#bfa878]",
  paused:
    "bg-violet-500/12 ring-1 ring-violet-400/35 hover:bg-violet-500/18 sepia:bg-[#c4a4e0] sepia:ring-2 sepia:ring-[#5a2d8a] sepia:hover:bg-[#b48ed6]",
  pending:
    "bg-fuchsia-500/14 ring-1 ring-fuchsia-400/45 hover:bg-fuchsia-500/20",
  finishing:
    "bg-lime-500/16 ring-1 ring-lime-400/45 hover:bg-lime-500/22 sepia:bg-[#b8d96a] sepia:ring-2 sepia:ring-[#4a6b14] sepia:hover:bg-[#a6cc4e]",
  pif: "bg-emerald-500/14 ring-1 ring-emerald-400/40 hover:bg-emerald-500/20 sepia:bg-[#86d4a8] sepia:ring-2 sepia:ring-[#1f6b45] sepia:hover:bg-[#6cc894]",
}

const NAME: Record<Exclude<HighlightTone, "none">, string> = {
  overdue: "text-rose-800 dark:text-rose-200 sepia:text-[#4a0d0d]",
  subscriberOverdue: "text-orange-900 dark:text-orange-100 sepia:text-[#4a2408]",
  collections: "text-amber-900 dark:text-amber-200 sepia:text-[#3d2e08]",
  paused: "text-violet-900 dark:text-violet-200 sepia:text-[#2e1050]",
  pending: "text-fuchsia-900 dark:text-fuchsia-100",
  finishing: "text-lime-800 dark:text-lime-100 sepia:text-[#243808]",
  pif: "text-emerald-900 dark:text-emerald-100 sepia:text-[#0c3d28]",
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
  if (tone === "pif") return " · no payments left"
  return student.phone ? "" : ` · ${student.email || ""}`
}

export const StudentRow = memo(function StudentRow({
  student,
  context = "roster",
  showStartDate = false,
}: {
  student: Student
  context?: "roster" | "contacts"
  showStartDate?: boolean
}) {
  const { updateStudent } = useStore()
  const tone = highlightTone(student)
  const left = remainingPayments(student)
  const labels = uniqueContactLabels(student)
  const idLabel = formatStudentId(student.id)
  const contact = isContact(student)
  const showCurrentStudent = context === "contacts" && !contact
  const showPlan = context === "roster" && (student.paymentPlan === "pif" || student.paymentPlan === "pp")

  return (
    <Link
      href={`/students/${student.id}`}
      data-highlight={context === "roster" && tone !== "none" ? tone : undefined}
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
          {[idLabel, student.phone ? formatPhone(student.phone) : ""]
            .filter(Boolean)
            .join(" · ")}
          {context === "roster" ? detail(student, tone, left) : ""}
          {context === "roster" &&
          showStartDate &&
          student.startDate &&
          tone !== "pending" &&
          tone !== "pif"
            ? ` · start ${formatDate(student.startDate)}`
            : ""}
        </p>
        {context === "roster" && labels.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {labels.map((label) => (
              <ContactLabelBadge
                key={label}
                label={label}
                onRemove={() => updateStudent(student.id, toggleStudentList(student, label))}
              />
            ))}
          </div>
        ) : null}
        {context === "contacts" && labels.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {labels.map((label) => (
              <ContactLabelBadge
                key={label}
                label={label}
                onRemove={() => updateStudent(student.id, toggleStudentList(student, label))}
              />
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
        {showPlan ? <PlanBadge plan={student.paymentPlan} /> : null}
      </div>
    </Link>
  )
})
