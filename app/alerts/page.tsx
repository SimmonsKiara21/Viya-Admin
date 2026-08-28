"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { useStore } from "@/lib/store"
import {
  attendanceMonthCount,
  isCollectionsStudent,
  isFinishingSoon,
  isOverdueStudent,
  isPausedStudent,
  isPendingStudent,
  remainingPayments,
} from "@/lib/alerts"
import { formatDate, formatMoney } from "@/lib/format"
import { sendDeskNotice } from "@/lib/send-notice"
import { ALERT_PAYMENT_REMINDER } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/types"

export default function AlertsPage() {
  const { students, attendance, addNotification } = useStore()
  const [message, setMessage] = useState(ALERT_PAYMENT_REMINDER)

  const overdue = useMemo(
    () =>
      students
        .filter(isOverdueStudent)
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
    () => students.filter((s) => isFinishingSoon(s, attendance)),
    [students, attendance],
  )

  function blast(channel: "sms" | "email") {
    sendDeskNotice({
      students: overdue,
      channel,
      subject: "Viya Academy — payment reminder",
      body: message,
      addNotification,
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Follow-up"
        title="Alerts"
        description="Overdue is red, collections is amber, paused is violet, pending starts (from the enrollment workbook only) are blue, and wrapping-up payment plans are teal. Photoshoot leads live on Contacts."
      />

      <Panel className="mb-6 grid gap-3">
        <h2 className="font-heading text-2xl">Text all / email all</h2>
        <p className="text-sm text-muted-foreground">
          Sends to every overdue or declined student on this page. Edit the note first if you need a
          different wording. Paused, collections, and pending stay on their own lists.
        </p>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="min-h-32"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => blast("sms")} disabled={!overdue.length || !message.trim()}>
            Text all
          </Button>
          <Button
            variant="outline"
            onClick={() => blast("email")}
            disabled={!overdue.length || !message.trim()}
          >
            Email all
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertList
          title="Overdue"
          count={overdue.length}
          empty="Nobody is overdue right now."
          hint="Staff see this list and a banner on every page. Text all or email all uses the message above."
          tone="overdue"
          students={overdue}
          line={(s) =>
            `Payment due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`
          }
        />
        <AlertList
          title="Collections"
          count={collections.length}
          empty="Nobody is in collections."
          hint="Accounts sent to collections — amber so they are not mixed in with a regular overdue follow-up."
          tone="collections"
          students={collections}
          line={(s) =>
            `Collections · ${formatMoney(s.nextPaymentAmount)} due ${formatDate(s.nextPaymentDate)}`
          }
        />
        <AlertList
          title="Paused"
          count={paused.length}
          empty="Nobody is paused."
          hint="Enrollment is on hold. Violet so the desk does not check them in by accident."
          tone="paused"
          students={paused}
          line={(s) => (s.notes ? s.notes : "Paused — not on the floor until they restart.")}
        />
        <AlertList
          title="Pending"
          count={pending.length}
          empty="No pending starts."
          hint="Not started yet — only people the enrollment workbook marks pending. Photoshoot leads are on Contacts."
          tone="pending"
          students={pending}
          line={(s) =>
            s.startDate ? `Start ${formatDate(s.startDate)}` : "Pending start — no first class date yet."
          }
        />
        <AlertList
          title="Wrapping up"
          count={finishing.length}
          empty="Nobody is in this window right now."
          hint="Current payment-plan students with 3 or fewer installments left who have checked in across at least two months. Good time to talk subscription."
          tone="finishing"
          students={finishing}
          line={(s) =>
            `${remainingPayments(s)} payment${(remainingPayments(s) ?? 0) === 1 ? "" : "s"} left · ${attendanceMonthCount(attendance, s.id)} months of check-ins`
          }
        />
      </div>
    </div>
  )
}

const TONE = {
  overdue: {
    panel: "ring-1 ring-rose-400/25",
    title: "text-rose-800 dark:text-rose-100 sepia:text-rose-200",
    divide: "divide-rose-400/15",
    line: "text-rose-800 dark:text-rose-200/90 sepia:text-rose-200",
  },
  collections: {
    panel: "ring-1 ring-amber-400/30",
    title: "text-amber-900 dark:text-amber-100 sepia:text-amber-200",
    divide: "divide-amber-400/20",
    line: "text-amber-900 dark:text-amber-200/90 sepia:text-amber-200",
  },
  paused: {
    panel: "ring-1 ring-violet-400/30",
    title: "text-violet-900 dark:text-violet-100 sepia:text-violet-200",
    divide: "divide-violet-400/20",
    line: "text-violet-900 dark:text-violet-200/90 sepia:text-violet-200",
  },
  pending: {
    panel: "ring-1 ring-sky-400/30",
    title: "text-sky-900 dark:text-sky-100 sepia:text-sky-200",
    divide: "divide-sky-400/20",
    line: "text-sky-900 dark:text-sky-200/90 sepia:text-sky-200",
  },
  finishing: {
    panel: "ring-1 ring-teal-400/25",
    title: "text-teal-800 dark:text-teal-100 sepia:text-teal-200",
    divide: "divide-teal-400/15",
    line: "text-teal-800 dark:text-teal-200/90 sepia:text-teal-200",
  },
} as const

function AlertList({
  title,
  count,
  empty,
  hint,
  tone,
  students,
  line,
}: {
  title: string
  count: number
  empty: string
  hint: string
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
      <p className="mb-4 text-sm text-muted-foreground">{hint}</p>
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
