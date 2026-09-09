"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Clock3, FolderOpen, Plus, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { Button } from "@/components/ui/button"
import { StudentFormDialog } from "@/components/student-form-dialog"
import { useStore } from "@/lib/store"
import { formatAcademyDate, formatAcademyTime } from "@/lib/format"
import {
  isCollectionsStudent,
  isCurrentlyEnrolled,
  isOverdueTalent,
  isPendingStudent,
  isSubscriberOverdue,
} from "@/lib/alerts"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/types"

function sortByName(list: Student[]) {
  return [...list].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
}

export default function HomePage() {
  const { students, resetRoster } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const stats = useMemo(() => {
    const current = sortByName(students.filter(isCurrentlyEnrolled))
    const overdue = sortByName(students.filter(isOverdueTalent))
    const collections = sortByName(students.filter(isCollectionsStudent))
    const subscriberOverdue = sortByName(students.filter(isSubscriberOverdue))
    const pending = sortByName(students.filter(isPendingStudent))
    return { current, overdue, collections, subscriberOverdue, pending }
  }, [students])

  return (
    <div>
      <PageHeader
        eyebrow="ViyaAdmin.com"
        title="Front desk"
        description="Talent, overdue, collections, and pending."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add talent
          </Button>
        }
      />

      <Panel className="mb-6">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Today · Phoenix
        </p>
        <p className="mt-2 font-heading text-2xl md:text-3xl">{formatAcademyDate(now)}</p>
        <p className="mt-1 font-heading text-xl tabular-nums text-primary md:text-2xl">
          <Clock3 className="mr-2 inline size-5 align-[-0.15em]" />
          {formatAcademyTime(now)}
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Talent" value={String(stats.current.length)} href="/students" />
        <StatCard icon={AlertTriangle} label="Overdue" value={String(stats.overdue.length)} href="/alerts" />
        <StatCard icon={FolderOpen} label="Collections" value={String(stats.collections.length)} href="/alerts" />
        <StatCard icon={AlertTriangle} label="Sub overdue" value={String(stats.subscriberOverdue.length)} href="/alerts" />
        <StatCard icon={UserPlus} label="Pending" value={String(stats.pending.length)} href="/students" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <NameList title="Talent" empty="No current academy talent." students={stats.current} href="/students" />
        <NameList
          title="Overdue"
          empty="Nobody is overdue."
          students={stats.overdue}
          href="/alerts"
          tone="overdue"
        />
        <NameList
          title="Collections"
          empty="Nobody is in collections or cancelling."
          students={stats.collections}
          href="/alerts"
          tone="collections"
        />
        <NameList
          title="Sub overdue"
          empty="No subscribers are overdue."
          students={stats.subscriberOverdue}
          href="/alerts"
          tone="subscriber"
        />
        <NameList
          title="Pending"
          empty="No pending starts."
          students={stats.pending}
          href="/students"
          tone="pending"
        />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Saved in this browser.{" "}
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => {
            resetRoster()
            toast.message("Roster restored.")
          }}
        >
          Restore roster
        </button>
      </p>
      <StudentFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function NameList({
  title,
  empty,
  students,
  href,
  tone,
}: {
  title: string
  empty: string
  students: Student[]
  href: string
  tone?: "overdue" | "collections" | "subscriber" | "pending"
}) {
  const heading =
    tone === "overdue"
      ? "text-rose-800 dark:text-rose-100"
      : tone === "collections"
        ? "text-amber-900 dark:text-amber-100"
        : tone === "subscriber"
          ? "text-orange-900 dark:text-orange-100"
          : tone === "pending"
            ? "text-sky-900 dark:text-sky-100"
            : ""

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={cn("font-heading text-xl leading-tight", heading)}>
          {title}
          <span className="ml-2 text-sm text-muted-foreground">{students.length}</span>
        </h2>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
          Open
        </Link>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
          {students.map((student) => (
            <div key={student.id} className="py-1">
              <StudentRow student={student} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Users
  label: string
  value: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <Panel className="h-full transition-colors hover:border-[oklch(0.78_0.08_85/0.4)]">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <Icon className="size-4 text-primary" />
        </div>
        <p className="mt-2 font-heading text-3xl leading-none">{value}</p>
      </Panel>
    </Link>
  )
}
