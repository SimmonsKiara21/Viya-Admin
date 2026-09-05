"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Clock3, Plus, UserMinus, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { Button, buttonVariants } from "@/components/ui/button"
import { StudentFormDialog } from "@/components/student-form-dialog"
import { useStore } from "@/lib/store"
import { formatAcademyDate, formatAcademyTime, formatDate, formatMoney } from "@/lib/format"
import { sendDeskNotice } from "@/lib/send-notice"
import {
  isCurrentlyEnrolled,
  isDeclinedStudent,
  isOverdueTalent,
  isPendingStudent,
  isSubscriberOverdue,
  paymentDeclinedSnippet,
} from "@/lib/alerts"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/types"

function sortByName(list: Student[]) {
  return [...list].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
}

export default function HomePage() {
  const { students, resetRoster, addNotification } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const stats = useMemo(() => {
    const current = sortByName(students.filter(isCurrentlyEnrolled))
    const declined = sortByName(students.filter(isDeclinedStudent))
    const overdueTalent = sortByName(students.filter(isOverdueTalent))
    const subscriberOverdue = sortByName(
      students.filter((s) => isSubscriberOverdue(s) && s.enrollmentStatus === "overdue"),
    )
    const pending = sortByName(students.filter(isPendingStudent))
    return { current, declined, overdueTalent, subscriberOverdue, pending }
  }, [students])

  return (
    <div>
      <PageHeader
        eyebrow="ViyaAdmin.com"
        title="Front desk"
        description="Currently enrolled, declined card notes, pending starts, overdue talent from the enrollment workbook, and overdue subscribers."
        actions={
          <>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add student
            </Button>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() =>
                sendDeskNotice({
                  students: [...stats.overdueTalent, ...stats.subscriberOverdue],
                  channel: "sms",
                  templateId: "overdue-sms",
                  addNotification,
                })
              }
            >
              Text overdue
            </button>
          </>
        }
      />

      <Panel className="mb-6">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Today · Phoenix
        </p>
        <p className="mt-2 font-heading text-3xl md:text-4xl">{formatAcademyDate(now)}</p>
        <p className="mt-1 font-heading text-2xl tabular-nums text-primary md:text-3xl">
          <Clock3 className="mr-2 inline size-6 align-[-0.15em]" />
          {formatAcademyTime(now)}
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Currently enrolled" value={String(stats.current.length)} href="/students" />
        <StatCard icon={UserMinus} label="Declined" value={String(stats.declined.length)} href="/students" />
        <StatCard icon={AlertTriangle} label="Overdue talent" value={String(stats.overdueTalent.length)} href="/alerts" />
        <StatCard icon={AlertTriangle} label="Overdue subscribers" value={String(stats.subscriberOverdue.length)} href="/alerts" />
        <StatCard icon={UserPlus} label="Pending start" value={String(stats.pending.length)} href="/students" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <NameList
          title="Currently enrolled"
          empty="Nobody is marked currently enrolled."
          students={stats.current}
          href="/students"
        />
        <NameList
          title="Declined"
          empty="No declined cards in the enrollment notes."
          students={stats.declined}
          href="/students"
          tone="declined"
          line={(s) => paymentDeclinedSnippet(s.notes) || s.notes || "Payment declined"}
        />
        <NameList
          title="Overdue talent"
          empty="No training accounts are overdue."
          students={stats.overdueTalent}
          href="/alerts"
          tone="overdue"
          line={(s) => `Due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`}
        />
        <NameList
          title="Overdue subscribers"
          empty="No subscribers are overdue."
          students={stats.subscriberOverdue}
          href="/alerts"
          tone="subscriber"
          line={(s) => `Due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`}
        />
        <NameList
          title="Pending start"
          empty="No pending starts."
          students={stats.pending}
          href="/students"
          tone="pending"
          line={(s) => (s.startDate ? `Start ${formatDate(s.startDate)}` : "Start date not set")}
        />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Roster is saved in this browser.{" "}
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => {
            resetRoster()
            toast.message("Roster restored.")
          }}
        >
          Restore the original roster
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
  line,
}: {
  title: string
  empty: string
  students: Student[]
  href: string
  tone?: "declined" | "overdue" | "subscriber" | "pending"
  line?: (student: Student) => string
}) {
  const heading =
    tone === "declined"
      ? "text-rose-800 dark:text-rose-100"
      : tone === "overdue"
        ? "text-rose-800 dark:text-rose-100"
        : tone === "subscriber"
          ? "text-orange-900 dark:text-orange-100"
          : tone === "pending"
            ? "text-sky-900 dark:text-sky-100"
            : ""

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={cn("font-heading text-2xl", heading)}>
          {title}
          <span className="ml-2 text-base text-muted-foreground">{students.length}</span>
        </h2>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
          Open list
        </Link>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
          {students.map((student) => (
            <div key={student.id} className="py-1">
              <StudentRow student={student} />
              {line ? <p className="px-2 pb-2 text-xs text-muted-foreground">{line(student)}</p> : null}
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
        <p className="mt-3 font-heading text-4xl">{value}</p>
      </Panel>
    </Link>
  )
}
