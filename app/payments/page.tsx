"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/ui-helpers"
import { PaymentMiniCalendar } from "@/components/payment-mini-calendar"
import {
  PaymentAmountInput,
  PaymentDateInput,
  PaymentEditToggle,
  PaymentItemSelect,
  PaymentStatusSelect,
  paymentItemKind,
} from "@/components/payment-row-edit"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PaymentBadge } from "@/components/status-badge"
import { useStore } from "@/lib/store"
import { formatDate, formatMoney, fullName } from "@/lib/format"
import { PAYMENT_LABELS } from "@/lib/constants"
import { displayPaymentNotes, paymentItemLabel } from "@/lib/square"
import type { PaymentRecord, PaymentStatus, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

type KindFilter = "all" | "training" | "sub" | "collections"

function kindFor(student: Student | undefined, bill: PaymentRecord): Exclude<KindFilter, "all"> {
  return paymentItemKind(student, bill)
}

export default function PaymentsPage() {
  const { payments, students, updatePayment } = useStore()
  const [filter, setFilter] = useState<PaymentStatus | "all">("all")
  const [kindFilter, setKindFilter] = useState<KindFilter>("all")
  const [calendarId, setCalendarId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const enrollmentIds = useMemo(() => new Set(students.map((s) => s.id)), [students])

  const rows = useMemo(() => {
    let list = payments.filter((p) => enrollmentIds.has(p.studentId))
    if (filter !== "all") list = list.filter((p) => p.status === filter)
    if (kindFilter !== "all") {
      list = list.filter((p) => kindFor(students.find((s) => s.id === p.studentId), p) === kindFilter)
    }
    const rank = (status: string) =>
      status === "overdue" ? 0 : status === "due" ? 1 : status === "declined" ? 2 : 3
    return [...list].sort((a, b) => {
      const r = rank(a.status) - rank(b.status)
      if (r !== 0) return r
      return (a.dueDate || "").localeCompare(b.dueDate || "")
    })
  }, [payments, filter, kindFilter, enrollmentIds, students])

  const calendarStudent = students.find((s) => s.id === calendarId)
  const calendarPayments = payments.filter((p) => p.studentId === calendarId)

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Payment tracker"
        description="Tap Edit on a row to change item, amount, due date, or status. Dates opens that person’s payment calendar."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "due", "overdue", "declined", "paid", "scheduled"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              filter === s
                ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                : "border-border text-muted-foreground",
            )}
          >
            {s === "all" ? "All" : PAYMENT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All items"],
            ["training", "Modeling and acting training"],
            ["sub", "Sub"],
            ["collections", "Collections"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setKindFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              kindFilter === key
                ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                : "border-border text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No payments in this view" description="Try another status or item filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((bill) => {
                const student = students.find((s) => s.id === bill.studentId)
                const editing = editingId === bill.id
                return (
                  <tr key={bill.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-3">
                      {student ? (
                        <Link href={`/students/${student.id}?tab=payments`} className="font-medium hover:underline">
                          {fullName(student)}
                        </Link>
                      ) : (
                        bill.studentId
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <PaymentItemSelect student={student} bill={bill} />
                      ) : (
                        paymentItemLabel(student, bill)
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {editing ? <PaymentAmountInput bill={bill} field="amount" /> : formatMoney(bill.amount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {editing ? <PaymentAmountInput bill={bill} field="paidAmount" /> : formatMoney(bill.paidAmount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.balance)}</td>
                    <td className="px-4 py-3">
                      {editing ? <PaymentDateInput bill={bill} /> : formatDate(bill.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? <PaymentStatusSelect bill={bill} /> : <PaymentBadge status={bill.status} />}
                    </td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Notes"
                        defaultValue={displayPaymentNotes(bill.notes)}
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          if (next === displayPaymentNotes(bill.notes)) return
                          updatePayment(bill.id, { notes: next })
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <PaymentEditToggle
                          editing={editing}
                          onToggle={() => setEditingId(editing ? null : bill.id)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setCalendarId(bill.studentId)}
                        >
                          <CalendarDays className="size-3.5" />
                          Dates
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaymentMiniCalendar
        student={calendarStudent}
        payments={calendarPayments}
        open={Boolean(calendarId)}
        onOpenChange={(open) => {
          if (!open) setCalendarId(null)
        }}
      />
    </div>
  )
}
