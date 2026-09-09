"use client"

import { useMemo } from "react"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { useStore } from "@/lib/store"
import {
  isAcademyOverdue,
  isCollectionsStudent,
  isFinishingSoon,
  isPaidInFull,
  isPausedStudent,
  isPendingStudent,
  isSubscriberOverdue,
} from "@/lib/alerts"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/types"

export default function AlertsPage() {
  const { students } = useStore()

  const academyOverdue = useMemo(
    () =>
      students
        .filter(isAcademyOverdue)
        .sort((a, b) => (a.nextPaymentDate || "").localeCompare(b.nextPaymentDate || "")),
    [students],
  )
  const subscriberOverdue = useMemo(
    () =>
      students
        .filter(isSubscriberOverdue)
        .sort((a, b) => (a.nextPaymentDate || "").localeCompare(b.nextPaymentDate || "")),
    [students],
  )
  const collections = useMemo(
    () => students.filter(isCollectionsStudent).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [students],
  )
  const paused = useMemo(
    () => students.filter(isPausedStudent).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [students],
  )
  const pending = useMemo(
    () => students.filter(isPendingStudent).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [students],
  )
  const finishing = useMemo(
    () => students.filter(isFinishingSoon),
    [students],
  )
  const pif = useMemo(
    () => students.filter(isPaidInFull).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [students],
  )

  return (
    <div>
      <PageHeader
        eyebrow="Follow-up"
        title="Alerts"
        description="Overdue is red. Collections is amber. Subscribers stay orange. Payment dates from a talent file show here when they are late."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertList
          title="Overdue"
          count={academyOverdue.length}
          empty="Nobody is overdue."
          tone="overdue"
          students={academyOverdue}
        />
        <AlertList
          title="Sub overdue"
          count={subscriberOverdue.length}
          empty="No subscribers are overdue."
          tone="subscriberOverdue"
          students={subscriberOverdue}
        />
        <AlertList
          title="Collections"
          count={collections.length}
          empty="Nobody is in collections or cancelling."
          tone="collections"
          students={collections}
        />
        <AlertList
          title="Paused"
          count={paused.length}
          empty="Nobody is paused."
          tone="paused"
          students={paused}
        />
        <AlertList
          title="Pending"
          count={pending.length}
          empty="No pending starts."
          tone="pending"
          students={pending}
        />
        <AlertList
          title="Wrapping up"
          count={finishing.length}
          empty="Nobody has fewer than 3 payments left."
          tone="finishing"
          students={finishing}
        />
        <AlertList
          title="Paid in full"
          count={pif.length}
          empty="Nobody is paid in full."
          tone="pif"
          students={pif}
        />
      </div>
    </div>
  )
}

const TONE = {
  overdue: {
    panel: "ring-1 ring-rose-400/25",
    title: "text-rose-800 dark:text-rose-100",
    divide: "divide-rose-400/15",
  },
  subscriberOverdue: {
    panel: "ring-1 ring-orange-400/30",
    title: "text-orange-900 dark:text-orange-100",
    divide: "divide-orange-400/20",
  },
  collections: {
    panel: "ring-1 ring-amber-400/30",
    title: "text-amber-900 dark:text-amber-100",
    divide: "divide-amber-400/20",
  },
  paused: {
    panel: "ring-1 ring-violet-400/30",
    title: "text-violet-900 dark:text-violet-100",
    divide: "divide-violet-400/20",
  },
  pending: {
    panel: "ring-1 ring-sky-400/30",
    title: "text-sky-900 dark:text-sky-100",
    divide: "divide-sky-400/20",
  },
  finishing: {
    panel: "ring-1 ring-lime-400/30",
    title: "text-lime-800 dark:text-lime-100",
    divide: "divide-lime-400/20",
  },
  pif: {
    panel: "ring-1 ring-emerald-400/30",
    title: "text-emerald-900 dark:text-emerald-100",
    divide: "divide-emerald-400/20",
  },
} as const

function AlertList({
  title,
  count,
  empty,
  tone,
  students,
}: {
  title: string
  count: number
  empty: string
  tone: keyof typeof TONE
  students: Student[]
}) {
  const look = TONE[tone]
  return (
    <Panel className={look.panel}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={cn("font-heading text-xl leading-tight", look.title)}>{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className={cn("divide-y", look.divide)}>
          {students.map((s) => (
            <div key={s.id} className="py-1">
              <StudentRow student={s} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
