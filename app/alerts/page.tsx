"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  remainingPayments,
} from "@/lib/alerts"
import { formatDate, formatMoney } from "@/lib/format"
import { sendDeskNotice } from "@/lib/send-notice"
import { ALERT_PAYMENT_REMINDER } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/types"

export default function AlertsPage() {
  const { students, addNotification } = useStore()
  const [message, setMessage] = useState(ALERT_PAYMENT_REMINDER)

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

  function blast(channel: "sms" | "email", list: Student[], subject: string) {
    sendDeskNotice({
      students: list,
      channel,
      subject,
      body: message,
      addNotification,
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Follow-up"
        title="Alerts"
        description="Overdue is red. Collections is amber. Subscribers stay orange."
      />

      <Panel className="mb-6 grid gap-3">
        <h2 className="font-heading text-2xl">Text / email</h2>
        <p className="text-sm text-muted-foreground">
          Send to overdue or subscriber overdue. Collections stays on its own list.
        </p>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="min-h-32"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => blast("sms", academyOverdue, "Viya Academy — payment reminder")}
            disabled={!academyOverdue.length || !message.trim()}
          >
            Text overdue
          </Button>
          <Button
            variant="outline"
            onClick={() => blast("email", academyOverdue, "Viya Academy — payment reminder")}
            disabled={!academyOverdue.length || !message.trim()}
          >
            Email overdue
          </Button>
          <Button
            onClick={() => blast("sms", subscriberOverdue, "Viya Talent — subscriber payment")}
            disabled={!subscriberOverdue.length || !message.trim()}
          >
            Text subscriber overdue
          </Button>
          <Button
            variant="outline"
            onClick={() => blast("email", subscriberOverdue, "Viya Talent — subscriber payment")}
            disabled={!subscriberOverdue.length || !message.trim()}
          >
            Email subscriber overdue
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertList
          title="Overdue"
          count={academyOverdue.length}
          empty="Nobody is overdue."
          tone="overdue"
          students={academyOverdue}
          line={(s) => `Due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`}
        />
        <AlertList
          title="Sub overdue"
          count={subscriberOverdue.length}
          empty="No subscribers are overdue."
          tone="subscriberOverdue"
          students={subscriberOverdue}
          line={(s) => `Due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`}
        />
        <AlertList
          title="Collections"
          count={collections.length}
          empty="Nobody is in collections or cancelling."
          tone="collections"
          students={collections}
          line={(s) =>
            `${s.enrollmentStatus === "cancelling" ? "Cancelling" : "Collections"} · ${formatMoney(s.nextPaymentAmount)}`
          }
        />
        <AlertList
          title="Paused"
          count={paused.length}
          empty="Nobody is paused."
          tone="paused"
          students={paused}
          line={(s) => s.notes || "Paused"}
        />
        <AlertList
          title="Pending"
          count={pending.length}
          empty="No pending starts."
          tone="pending"
          students={pending}
          line={(s) => (s.startDate ? `Start ${formatDate(s.startDate)}` : "No start date")}
        />
        <AlertList
          title="Wrapping up"
          count={finishing.length}
          empty="Nobody has fewer than 3 payments left."
          tone="finishing"
          students={finishing}
          line={(s) =>
            `${remainingPayments(s)} left · started ${formatDate(s.startDate)}`
          }
        />
        <AlertList
          title="Paid in full"
          count={pif.length}
          empty="Nobody is paid in full."
          tone="pif"
          students={pif}
          line={(s) => (s.startDate ? `Started ${formatDate(s.startDate)}` : "Paid in full")}
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
    line: "text-rose-800 dark:text-rose-200/90",
  },
  subscriberOverdue: {
    panel: "ring-1 ring-orange-400/30",
    title: "text-orange-900 dark:text-orange-100",
    divide: "divide-orange-400/20",
    line: "text-orange-900 dark:text-orange-200/90",
  },
  collections: {
    panel: "ring-1 ring-amber-400/30",
    title: "text-amber-900 dark:text-amber-100",
    divide: "divide-amber-400/20",
    line: "text-amber-900 dark:text-amber-200/90",
  },
  paused: {
    panel: "ring-1 ring-violet-400/30",
    title: "text-violet-900 dark:text-violet-100",
    divide: "divide-violet-400/20",
    line: "text-violet-900 dark:text-violet-200/90",
  },
  pending: {
    panel: "ring-1 ring-sky-400/30",
    title: "text-sky-900 dark:text-sky-100",
    divide: "divide-sky-400/20",
    line: "text-sky-900 dark:text-sky-200/90",
  },
  finishing: {
    panel: "ring-1 ring-lime-400/30",
    title: "text-lime-800 dark:text-lime-100",
    divide: "divide-lime-400/20",
    line: "text-lime-800 dark:text-lime-200/90",
  },
  pif: {
    panel: "ring-1 ring-emerald-400/30",
    title: "text-emerald-900 dark:text-emerald-100",
    divide: "divide-emerald-400/20",
    line: "text-emerald-900 dark:text-emerald-200/90",
  },
} as const

function AlertList({
  title,
  count,
  empty,
  tone,
  students,
  line,
}: {
  title: string
  count: number
  empty: string
  tone: keyof typeof TONE
  students: Student[]
  line: (student: Student) => string
}) {
  const look = TONE[tone]
  return (
    <Panel className={look.panel}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={cn("font-heading text-2xl", look.title)}>{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className={cn("divide-y", look.divide)}>
          {students.map((s) => (
            <div key={s.id} className="py-1">
              <StudentRow student={s} />
              <p className={cn("px-2 pb-2 text-xs", look.line)}>{line(s)}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
