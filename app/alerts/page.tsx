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
        description="Academy overdue is red. Subscriber overdue is orange. Students with fewer than 3 payments left who started May 2026 or earlier are lime. Collections is amber, paused is violet, pending starts are blue."
      />

      <Panel className="mb-6 grid gap-3">
        <h2 className="font-heading text-2xl">Text all / email all</h2>
        <p className="text-sm text-muted-foreground">
          Edit the note, then send it to academy overdue or subscriber overdue separately. Paused,
          collections, and pending stay on their own lists.
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
            Text academy overdue
          </Button>
          <Button
            variant="outline"
            onClick={() => blast("email", academyOverdue, "Viya Academy — payment reminder")}
            disabled={!academyOverdue.length || !message.trim()}
          >
            Email academy overdue
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
          title="Academy overdue"
          count={academyOverdue.length}
          empty="No academy or training accounts are overdue."
          hint="Payment-plan and academy students. Highlighted in red on every list."
          tone="overdue"
          students={academyOverdue}
          line={(s) =>
            `Payment due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`
          }
        />
        <AlertList
          title="Subscriber overdue"
          count={subscriberOverdue.length}
          empty="No subscribers are overdue."
          hint="Subscription accounts only. Highlighted in orange so they are not mixed with academy follow-up."
          tone="subscriberOverdue"
          students={subscriberOverdue}
          line={(s) =>
            `Subscriber due ${formatDate(s.nextPaymentDate)} · ${formatMoney(s.nextPaymentAmount)}`
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
          title="Fewer than 3 payments"
          count={finishing.length}
          empty="Nobody in this window — current academy plans that started May 2026 or earlier with fewer than 3 payments left."
          hint="Lime highlight. Started May 2026 or before, still current on a payment plan, with 0–2 installments left. A good time to talk subscription."
          tone="finishing"
          students={finishing}
          line={(s) =>
            `${remainingPayments(s)} payment${(remainingPayments(s) ?? 0) === 1 ? "" : "s"} left · started ${formatDate(s.startDate)}`
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
  subscriberOverdue: {
    panel: "ring-1 ring-orange-400/30",
    title: "text-orange-900 dark:text-orange-100 sepia:text-orange-100",
    divide: "divide-orange-400/20",
    line: "text-orange-900 dark:text-orange-200/90 sepia:text-orange-100",
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
    panel: "ring-1 ring-lime-400/30",
    title: "text-lime-800 dark:text-lime-100 sepia:text-lime-100",
    divide: "divide-lime-400/20",
    line: "text-lime-800 dark:text-lime-200/90 sepia:text-lime-100",
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
