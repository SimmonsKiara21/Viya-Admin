"use client"

import { useMemo, useState } from "react"
import { CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, Panel } from "@/components/ui-helpers"
import { PaymentMiniCalendar } from "@/components/payment-mini-calendar"
import {
  PaymentAmountInput,
  PaymentDateInput,
  PaymentItemSelect,
  PaymentStatusSelect,
} from "@/components/payment-row-edit"
import { useStore, useSync } from "@/lib/store"
import { todayISO } from "@/lib/format"
import {
  biweeklyFridays,
  buildPaymentSchedule,
  fillCountForStudent,
  paymentFromScheduleRow,
  paymentSourceLabel,
} from "@/lib/schedule"
import type { PaymentRecord, Student } from "@/lib/types"

type ScheduleDraft = { key: string; date: string; amount: string }

function newDraftKey() {
  return `row-${Math.random().toString(36).slice(2, 10)}`
}

function blankScheduleDraft(count = 1): ScheduleDraft[] {
  return Array.from({ length: count }, () => ({ key: newDraftKey(), date: "", amount: "" }))
}

export function StudentPaymentsTab({ student }: { student: Student }) {
  const { payments, updateStudent, addPayments, ensureSchedulePayment, removePayment } = useStore()
  const { square } = useSync()
  const [draftRows, setDraftRows] = useState<ScheduleDraft[]>(() => blankScheduleDraft())
  const [calendarOpen, setCalendarOpen] = useState(false)

  const bills = useMemo(
    () =>
      payments
        .filter((p) => p.studentId === student.id)
        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [payments, student.id],
  )
  const schedule = useMemo(() => buildPaymentSchedule(student, bills), [student, bills])

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl">Add payment schedule</h2>
          {square.connected ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Square invoices are live on this calendar.
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setCalendarOpen(true)}>
          <CalendarDays className="size-3.5" />
          Dates
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[420px] table-fixed text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-[42%] px-3 py-2 font-medium">Run date</th>
              <th className="w-[42%] px-3 py-2 font-medium">Amount</th>
              <th className="w-[16%] px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {draftRows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Input
                    type="date"
                    className="h-9 w-full"
                    value={row.date}
                    onChange={(e) =>
                      setDraftRows((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, date: e.target.value } : r)),
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-9 w-full"
                    placeholder="104.00"
                    value={row.amount}
                    onChange={(e) =>
                      setDraftRows((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)),
                      )
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={draftRows.length <= 1}
                    onClick={() =>
                      setDraftRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== row.key)))
                    }
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setDraftRows((rows) => [...rows, { key: newDraftKey(), date: "", amount: "" }])}
        >
          Add row
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const first = draftRows.find((r) => r.date && r.amount)
            if (!first) {
              toast.error("Enter a Friday date and amount on the first filled row, then fill every two weeks.")
              return
            }
            const count = fillCountForStudent(student)
            setDraftRows(
              biweeklyFridays(first.date, count).map((date) => ({
                key: newDraftKey(),
                date,
                amount: first.amount,
              })),
            )
          }}
        >
          Fill every 2 weeks
        </Button>
        <Button
          onClick={() => {
            const ready = draftRows
              .map((row) => ({
                date: row.date,
                amount: Number(row.amount),
              }))
              .filter((row) => row.date && Number.isFinite(row.amount) && row.amount > 0)
            if (!ready.length) {
              toast.error("Add at least one date and amount.")
              return
            }
            const today = todayISO()
            addPayments(
              ready.map((row) => ({
                studentId: student.id,
                amount: row.amount,
                paidAmount: 0,
                balance: row.amount,
                dueDate: row.date,
                paidDate: "",
                status: row.date < today ? "overdue" : "scheduled",
                method: "other",
                squareInvoiceId: "",
                notes: "Desk schedule",
                itemId: "",
                itemName: "Desk schedule",
                itemDescription: "",
                itemKind: student.program === "subscriber" ? "subscriber" : "academy",
                source: "manual",
              })),
            )
            setDraftRows(blankScheduleDraft())
            toast.success(
              ready.length === 1
                ? "Payment date saved. It will show on Calendar and Alerts when due."
                : `${ready.length} payments saved. They will show on Calendar and Alerts when due.`,
            )
          }}
        >
          Save schedule
        </Button>
      </div>
      <div className="mt-8 mb-6 overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r">
            <Field label="Amount due">
              <Input
                type="number"
                className="h-9 w-full"
                value={student.nextPaymentAmount ?? ""}
                onChange={(e) =>
                  updateStudent(student.id, {
                    nextPaymentAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
          </div>
          <div className="p-3">
            <Field label="Next payment date">
              <Input
                type="date"
                className="h-9 w-full"
                value={student.nextPaymentDate}
                onChange={(e) => updateStudent(student.id, { nextPaymentDate: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>
      {schedule.length > 0 ? (
        <div className="mb-4">
          <h2 className="mb-3 font-heading text-xl">Payment calendar</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, index) => {
                  const bill =
                    (row.paymentId ? bills.find((item) => item.id === row.paymentId) : undefined) ??
                    ({ ...paymentFromScheduleRow(student, row), id: "" } as PaymentRecord)
                  const save = (patch: Partial<PaymentRecord>) => {
                    ensureSchedulePayment(student, row, patch)
                    if (patch.dueDate !== undefined) {
                      const isNext =
                        !student.nextPaymentDate ||
                        row.date === student.nextPaymentDate ||
                        patch.dueDate <= (student.nextPaymentDate || patch.dueDate)
                      if (isNext) {
                        updateStudent(student.id, {
                          nextPaymentDate: patch.dueDate,
                          nextPaymentAmount:
                            patch.amount !== undefined ? patch.amount : student.nextPaymentAmount,
                        })
                      }
                    }
                  }
                  return (
                    <tr
                      key={`${row.date}-${row.source}-${row.paymentId || index}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2">
                        <PaymentDateInput bill={bill} onPatch={save} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{paymentSourceLabel(row.source)}</td>
                      <td className="px-3 py-2">
                        <PaymentItemSelect student={student} bill={bill} onPatch={save} />
                      </td>
                      <td className="px-3 py-2">
                        <PaymentAmountInput bill={bill} field="amount" onPatch={save} />
                      </td>
                      <td className="px-3 py-2">
                        <PaymentStatusSelect bill={bill} onPatch={save} />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            if (bill.id) {
                              removePayment(bill.id)
                              toast.message("Payment removed from the schedule.")
                              return
                            }
                            updateStudent(student.id, { nextPaymentDate: "", nextPaymentAmount: null })
                            toast.message("Payment removed from the schedule.")
                          }}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No Square invoice or payment due on file.</p>
      )}
      <PaymentMiniCalendar
        student={student}
        payments={bills}
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
      />
    </Panel>
  )
}
