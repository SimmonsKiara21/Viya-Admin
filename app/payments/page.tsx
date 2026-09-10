"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { EmptyState, NativeSelect, PageHeader } from "@/components/ui-helpers"
import { PaymentMiniCalendar } from "@/components/payment-mini-calendar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { formatDate, formatMoney, fullName, todayISO } from "@/lib/format"
import { PAYMENT_LABELS } from "@/lib/constants"
import { displayPaymentNotes, paymentItemLabel } from "@/lib/square"
import type { PaymentRecord, PaymentStatus, SquareItemKind, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

type KindFilter = "all" | "training" | "sub" | "collections"

function kindFor(student: Student | undefined, bill: PaymentRecord): Exclude<KindFilter, "all"> {
  const label = paymentItemLabel(student, bill)
  if (label === "Collections") return "collections"
  if (label === "Sub") return "sub"
  return "training"
}

function kindPatch(kind: Exclude<KindFilter, "all">): Partial<PaymentRecord> {
  if (kind === "collections") return { itemKind: "fee" as SquareItemKind, itemId: "cancellation" }
  if (kind === "sub") return { itemKind: "subscriber" as SquareItemKind }
  return { itemKind: "academy" as SquareItemKind, itemId: "va101" }
}

function statusPatch(bill: PaymentRecord, status: PaymentStatus): Partial<PaymentRecord> {
  if (status === "paid") {
    return { status, paidAmount: bill.amount, balance: 0, paidDate: bill.paidDate || todayISO() }
  }
  return { status, balance: Math.max(bill.amount - bill.paidAmount, 0) }
}

export default function PaymentsPage() {
  const { payments, students, updatePayment } = useStore()
  const [filter, setFilter] = useState<PaymentStatus | "all">("all")
  const [kindFilter, setKindFilter] = useState<KindFilter>("all")
  const [calendarId, setCalendarId] = useState<string | null>(null)

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
        description="Edit status or item on any row. Open the calendar to see that person’s payment dates."
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
                <th className="px-4 py-3 font-medium">Calendar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((bill) => {
                const student = students.find((s) => s.id === bill.studentId)
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
                      <NativeSelect
                        className="h-8 min-w-[12rem] text-xs"
                        value={kindFor(student, bill)}
                        onChange={(e) =>
                          updatePayment(bill.id, kindPatch(e.target.value as Exclude<KindFilter, "all">))
                        }
                      >
                        <option value="training">Modeling and acting training</option>
                        <option value="sub">Sub</option>
                        <option value="collections">Collections</option>
                      </NativeSelect>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.amount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.paidAmount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.balance)}</td>
                    <td className="px-4 py-3">{formatDate(bill.dueDate)}</td>
                    <td className="px-4 py-3">
                      <NativeSelect
                        className="h-8 w-[8.5rem] text-xs"
                        value={bill.status}
                        onChange={(e) =>
                          updatePayment(bill.id, statusPatch(bill, e.target.value as PaymentStatus))
                        }
                      >
                        {(Object.keys(PAYMENT_LABELS) as PaymentStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {PAYMENT_LABELS[status]}
                          </option>
                        ))}
                      </NativeSelect>
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
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setCalendarId(bill.studentId)}
                      >
                        <CalendarDays className="size-3.5" />
                        Dates
                      </Button>
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
