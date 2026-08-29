"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, CalendarCheck, CreditCard, Plus, Users } from "lucide-react"
import { toast } from "sonner"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { ClassBadge, EnrollmentBadge } from "@/components/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { StudentFormDialog } from "@/components/student-form-dialog"
import { EnrollmentSyncCard } from "@/components/enrollment-sync-card"
import { countsFor, useStore, useSync } from "@/lib/store"
import { formatDate, formatMoney, formatTime, formatShortDate, fullName, todayISO } from "@/lib/format"
import { sendDeskNotice } from "@/lib/send-notice"
import { isAcademyOverdue, isFinishingSoon, isPendingStudent, isSubscriberOverdue } from "@/lib/alerts"
import { openBalance } from "@/lib/square"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { students, attendance, payments, resetRoster, addNotification } = useStore()
  const { square, enrollment, jotform } = useSync()
  const [addOpen, setAddOpen] = useState(false)
  const today = todayISO()

  const stats = useMemo(() => {
    const academy = students.filter((s) => s.program === "academy")
    const academyOverdue = students.filter(isAcademyOverdue)
    const subscriberOverdue = students.filter(isSubscriberOverdue)
    const attention = [...academyOverdue, ...subscriberOverdue]
    const pending = students.filter(isPendingStudent)
    const finishing = students.filter(isFinishingSoon)
    const todayCheckins = attendance.filter((a) => a.checkedInAt.slice(0, 10) === today)
    const recent = [...attendance].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))
    const openTotal = openBalance(payments)
    return { academy, academyOverdue, subscriberOverdue, attention, pending, finishing, todayCheckins, recent, openTotal }
  }, [students, attendance, payments, today])

  return (
    <div>
      <PageHeader
        eyebrow="Viya Academy + Agency"
        title="Front desk"
        description="Look up talent, track Square invoices, and send a text or Gmail. Enrollment and Square refresh in the background."
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
                  students: stats.attention,
                  channel: "sms",
                  templateId: "overdue-sms",
                  addNotification,
                })
              }
            >
              Alert overdue students
            </button>
          </>
        }
      />

      <p className="mb-4 text-xs text-muted-foreground">
        {enrollment.message || "Enrollment workbook loaded."}
        {enrollment.fetchedAt ? ` · sheet ${formatTime(enrollment.fetchedAt)}` : ""}
        {" · "}
        {square.message || "Square invoices overlay enrollment students."}
        {square.matched != null ? ` · ${square.matched} invoices matched` : ""}
        {square.fetchedAt ? ` · Square ${formatTime(square.fetchedAt)}` : ""}
        {" · "}
        {jotform.connected ? "Jotform connected" : jotform.message || "Jotform syncing"}
        {jotform.fetchedAt ? ` · check-in ${formatTime(jotform.fetchedAt)}` : ""}
      </p>

      <EnrollmentSyncCard />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Academy roster"
          value={String(stats.academy.length)}
          href="/students"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs attention"
          value={String(stats.attention.length)}
          hint="Overdue — due dates on the name"
          href="/alerts"
        />
        <StatCard
          icon={CreditCard}
          label="Open Square"
          value={formatMoney(stats.openTotal)}
          hint="Due, overdue, and declined"
          href="/payments"
        />
        <StatCard
          icon={CalendarCheck}
          label="Checked in today"
          value={String(stats.todayCheckins.length)}
          href="/attendance"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-2xl text-rose-800 dark:text-rose-100 sepia:text-rose-200">
              Academy overdue
            </h2>
            <Link href="/alerts" className="text-xs text-muted-foreground hover:text-foreground">
              Alerts
            </Link>
          </div>
          {stats.academyOverdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No academy or training accounts are overdue.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.academyOverdue.slice(0, 8).map((s) => (
                <div key={s.id} className="py-1">
                  <StudentRow student={s} />
                  <p className="px-2 pb-2 text-xs text-rose-800 dark:text-rose-200/90 sepia:text-rose-200">
                    Student alert: payment due {formatDate(s.nextPaymentDate)} ·{" "}
                    {formatMoney(s.nextPaymentAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-2xl text-orange-900 dark:text-orange-100 sepia:text-orange-100">
              Subscriber overdue
            </h2>
            <Link href="/alerts" className="text-xs text-muted-foreground hover:text-foreground">
              Alerts
            </Link>
          </div>
          {stats.subscriberOverdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscribers are overdue.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.subscriberOverdue.slice(0, 8).map((s) => (
                <div key={s.id} className="py-1">
                  <StudentRow student={s} />
                  <p className="px-2 pb-2 text-xs text-orange-900 dark:text-orange-200/90 sepia:text-orange-100">
                    Subscriber alert: payment due {formatDate(s.nextPaymentDate)} ·{" "}
                    {formatMoney(s.nextPaymentAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-2xl">Latest check-ins</h2>
            <Link href="/attendance" className="text-xs text-muted-foreground hover:text-foreground">
              Attendance
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet. Use the Check-in tab at the door.</p>
          ) : (
            <ul className="grid gap-2">
              {stats.recent.slice(0, 8).map((row) => {
                const student = students.find((s) => s.id === row.studentId)
                if (!student) return null
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/students/${student.id}`} className="min-w-0 font-medium hover:underline">
                      {fullName(student)}
                    </Link>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <ClassBadge type={row.classType} />
                      <span className="tabular-nums">
                        {formatShortDate(row.checkedInAt)} · {formatTime(row.checkedInAt)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-heading text-2xl text-sky-900 dark:text-sky-100 sepia:text-sky-200">
            Pending starts
          </h2>
          {stats.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending starts on the enrollment workbook.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.pending.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 py-1">
                  <div className="min-w-0 flex-1">
                    <StudentRow student={s} />
                  </div>
                  <EnrollmentBadge status={s.enrollmentStatus} />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-heading text-2xl text-lime-800 dark:text-lime-100 sepia:text-lime-100">
            Fewer than 3 payments
          </h2>
          {stats.finishing.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No current academy payment-plan students who started May 2026 or earlier with fewer than 3 payments left.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {stats.finishing.slice(0, 8).map((s) => (
                <StudentRow key={s.id} student={s} />
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-heading text-2xl">Tonight&apos;s class mix</h2>
          {stats.todayCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody has checked in today. The Aug 26 roster is under Attendance if you need last class.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Modeling {countsFor(stats.todayCheckins).modeling} · Acting{" "}
              {countsFor(stats.todayCheckins).acting} · Subscriber{" "}
              {countsFor(stats.todayCheckins).subscriber}
            </p>
          )}
        </Panel>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Roster is saved in this browser.{" "}
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => {
            resetRoster()
            toast.message("Workbook roster restored.")
          }}
        >
          Restore the original workbook
        </button>
      </p>
      <StudentFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Users
  label: string
  value: string
  hint?: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <Panel className="h-full transition-colors hover:border-[oklch(0.78_0.08_85/0.4)]">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <Icon className="size-4 text-[oklch(0.78_0.08_85)]" />
        </div>
        <p className="mt-3 font-heading text-4xl">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </Panel>
    </Link>
  )
}
