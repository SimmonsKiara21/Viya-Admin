"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { useStore } from "@/lib/store"
import {
  attendanceMonthCount,
  isFinishingSoon,
  isOverdueStudent,
  remainingPayments,
} from "@/lib/alerts"
import { formatDate, formatMoney } from "@/lib/format"
import { sendDeskNotice } from "@/lib/send-notice"
import { MESSAGE_TEMPLATES } from "@/lib/constants"

export default function AlertsPage() {
  const { students, attendance, addNotification } = useStore()

  const overdue = useMemo(
    () =>
      students
        .filter(isOverdueStudent)
        .sort((a, b) => (a.nextPaymentDate || "").localeCompare(b.nextPaymentDate || "")),
    [students],
  )
  const finishing = useMemo(
    () => students.filter((s) => isFinishingSoon(s, attendance)),
    [students, attendance],
  )

  const overdueTemplate = MESSAGE_TEMPLATES.find((t) => t.id === "overdue-sms")!

  return (
    <div>
      <PageHeader
        eyebrow="Follow-up"
        title="Alerts"
        description="Overdue accounts light up in red with the due date. Students with 3 or fewer payments left and at least two months of check-ins light up in teal."
        actions={
          <Button
            onClick={() =>
              sendDeskNotice({
                students: overdue,
                channel: "sms",
                templateId: "overdue-sms",
                subject: overdueTemplate.subject,
                body: overdueTemplate.body,
                addNotification,
              })
            }
            disabled={!overdue.length}
          >
            Alert overdue students
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="ring-1 ring-rose-400/25">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-2xl text-rose-100">Overdue</h2>
            <span className="text-xs text-rose-200/80">{overdue.length}</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Staff see this list and a banner on every page. Send the student alert to text everyone
            here with their amount and due date.
          </p>
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is overdue right now.</p>
          ) : (
            <div className="divide-y divide-rose-400/15">
              {overdue.map((s) => (
                <div key={s.id} className="py-1">
                  <StudentRow student={s} />
                  <p className="px-2 pb-2 text-xs text-rose-200/90">
                    Payment due {formatDate(s.nextPaymentDate)} · {formatMoney(s.nextPaymentAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="ring-1 ring-teal-400/25">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-2xl text-teal-100">Wrapping up</h2>
            <span className="text-xs text-teal-200/80">{finishing.length}</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Current payment-plan students with 3 or fewer installments left who have checked in
            across at least two months. Good time to talk subscription.
          </p>
          {finishing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is in this window right now.</p>
          ) : (
            <div className="divide-y divide-teal-400/15">
              {finishing.map((s) => (
                <div key={s.id} className="py-1">
                  <StudentRow student={s} />
                  <p className="px-2 pb-2 text-xs text-teal-200/90">
                    {remainingPayments(s)} payment{(remainingPayments(s) ?? 0) === 1 ? "" : "s"} left
                    · {attendanceMonthCount(attendance, s.id)} months of check-ins
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
