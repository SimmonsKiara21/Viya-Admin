"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PaymentBadge } from "@/components/status-badge"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { formatDate, formatMoney, fullName } from "@/lib/format"
import { PAYMENT_LABELS } from "@/lib/constants"
import { SQUARE_ITEMS, itemKindLabel, openBalance } from "@/lib/square"
import type { PaymentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type ItemFilter = "all" | string

export default function PaymentsPage() {
  const { payments, students, addNotification, updateStudent } = useStore()
  const [filter, setFilter] = useState<PaymentStatus | "all">("all")
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all")
  const [square, setSquare] = useState<{
    connected: boolean
    message: string
    matchedInvoices?: number
    skippedCount?: number
    syncedAt?: string
  } | null>(null)

  useEffect(() => {
    fetch("/api/square")
      .then((r) => r.json())
      .then(setSquare)
      .catch(() =>
        setSquare({
          connected: false,
          message: "Could not reach the Square status endpoint.",
        }),
      )
  }, [])

  const enrollmentIds = useMemo(() => new Set(students.map((s) => s.id)), [students])

  const rows = useMemo(() => {
    let list = payments.filter((p) => enrollmentIds.has(p.studentId))
    if (filter !== "all") list = list.filter((p) => p.status === filter)
    if (itemFilter !== "all") list = list.filter((p) => p.itemId === itemFilter)
    return [...list].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
  }, [payments, filter, itemFilter, enrollmentIds])

  const openTotal = openBalance(payments.filter((p) => enrollmentIds.has(p.studentId)))
  const usedItems = SQUARE_ITEMS.filter((item) => payments.some((p) => p.itemId === item.id))

  function remind(studentId: string) {
    const student = students.find((s) => s.id === studentId)
    if (!student) return
    addNotification({
      studentIds: [student.id],
      channel: "sms",
      subject: "",
      body: `Hi ${student.firstName}, Viya Academy — Square reminder for ${formatMoney(student.nextPaymentAmount)} due ${formatDate(student.nextPaymentDate)}.`,
      status: "demo",
    })
    updateStudent(student.id, {
      notes: `${student.notes ? student.notes + " " : ""}Square reminder logged ${new Date().toLocaleDateString()}.`.trim(),
    })
    toast.success(`Square reminder logged for ${fullName(student)}.`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Square"
        title="Payment tracker"
        description="Square invoices and subscriptions for students on the 2026 enrollment workbook only. Anyone on Square who is not on that list is left off."
      />

      <Panel className="mb-6">
        <p className="text-xs font-medium tracking-wide text-[oklch(0.78_0.08_85)] uppercase">
          {square?.connected ? "Square connected" : "Desk mode · Square dashboard"}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {square?.message || "Checking Square…"}
        </p>
        <p className="mt-3 font-heading text-3xl">{formatMoney(openTotal)} open</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {square?.matchedInvoices != null
            ? `${square.matchedInvoices} Square invoices matched to enrollment · ${square.skippedCount ?? 0} Square-only customers skipped`
            : "Enrollment students only"}
          {square?.syncedAt ? ` · synced ${square.syncedAt}` : ""}
        </p>
      </Panel>

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
            {s === "all" ? "All invoices" : PAYMENT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setItemFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            itemFilter === "all"
              ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
              : "border-border text-muted-foreground",
          )}
        >
          All Square items
        </button>
        {usedItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setItemFilter(item.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              itemFilter === item.id
                ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                : "border-border text-muted-foreground",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No invoices in this view" description="Try another status or Square item filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Square item</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((bill) => {
                const student = students.find((s) => s.id === bill.studentId)
                return (
                  <tr key={bill.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-3">
                      {student ? (
                        <Link href={`/students/${student.id}`} className="font-medium hover:underline">
                          {fullName(student)}
                        </Link>
                      ) : (
                        bill.studentId
                      )}
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                        {bill.squareInvoiceId}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="font-medium">{bill.itemName || "—"}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {itemKindLabel(bill.itemKind)}
                      </p>
                      {bill.itemDescription ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{bill.itemDescription}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.amount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.paidAmount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(bill.balance)}</td>
                    <td className="px-4 py-3">{formatDate(bill.dueDate)}</td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={bill.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {["due", "overdue", "declined"].includes(bill.status) && student ? (
                        <Button size="xs" variant="outline" onClick={() => remind(student.id)}>
                          Square reminder
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
