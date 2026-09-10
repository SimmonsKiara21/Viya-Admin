"use client"

import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui-helpers"
import { PAYMENT_LABELS } from "@/lib/constants"
import { todayISO } from "@/lib/format"
import { paymentItemLabel } from "@/lib/square"
import { useStore } from "@/lib/store"
import type { PaymentRecord, PaymentStatus, SquareItemKind, Student } from "@/lib/types"

type ItemKind = "training" | "sub" | "collections"

export function paymentItemKind(student: Student | undefined, bill: PaymentRecord): ItemKind {
  const label = paymentItemLabel(student, bill)
  if (label === "Collections") return "collections"
  if (label === "Sub") return "sub"
  return "training"
}

export function paymentItemPatch(kind: ItemKind): Partial<PaymentRecord> {
  if (kind === "collections") return { itemKind: "fee" as SquareItemKind, itemId: "cancellation" }
  if (kind === "sub") return { itemKind: "subscriber" as SquareItemKind }
  return { itemKind: "academy" as SquareItemKind, itemId: "va101" }
}

export function paymentStatusPatch(bill: PaymentRecord, status: PaymentStatus): Partial<PaymentRecord> {
  if (status === "paid") {
    return { status, paidAmount: bill.amount, balance: 0, paidDate: bill.paidDate || todayISO() }
  }
  return { status, balance: Math.max(bill.amount - bill.paidAmount, 0) }
}

export function PaymentEditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant="outline" size="xs" onClick={onToggle}>
      <Pencil className="size-3" />
      {editing ? "Done" : "Edit"}
    </Button>
  )
}

export function PaymentItemSelect({
  student,
  bill,
}: {
  student: Student | undefined
  bill: PaymentRecord
}) {
  const { updatePayment } = useStore()
  return (
    <NativeSelect
      className="h-8 min-w-[12rem] text-xs"
      value={paymentItemKind(student, bill)}
      onChange={(e) => updatePayment(bill.id, paymentItemPatch(e.target.value as ItemKind))}
    >
      <option value="training">Modeling and acting training</option>
      <option value="sub">Sub</option>
      <option value="collections">Collections</option>
    </NativeSelect>
  )
}

export function PaymentStatusSelect({ bill }: { bill: PaymentRecord }) {
  const { updatePayment } = useStore()
  return (
    <NativeSelect
      className="h-8 w-[8.5rem] text-xs"
      value={bill.status}
      onChange={(e) => updatePayment(bill.id, paymentStatusPatch(bill, e.target.value as PaymentStatus))}
    >
      {(Object.keys(PAYMENT_LABELS) as PaymentStatus[]).map((status) => (
        <option key={status} value={status}>
          {PAYMENT_LABELS[status]}
        </option>
      ))}
    </NativeSelect>
  )
}

export function PaymentDateInput({ bill }: { bill: PaymentRecord }) {
  const { updatePayment } = useStore()
  return (
    <Input
      type="date"
      className="h-8 text-xs"
      value={(bill.dueDate || "").slice(0, 10)}
      onChange={(e) => updatePayment(bill.id, { dueDate: e.target.value })}
    />
  )
}

export function PaymentAmountInput({
  bill,
  field,
}: {
  bill: PaymentRecord
  field: "amount" | "paidAmount"
}) {
  const { updatePayment } = useStore()
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      className="h-8 w-[6.5rem] text-xs tabular-nums"
      value={bill[field] || ""}
      onChange={(e) => {
        const value = e.target.value ? Number(e.target.value) : 0
        if (field === "amount") {
          const paid = Math.min(bill.paidAmount, value)
          updatePayment(bill.id, {
            amount: value,
            paidAmount: paid,
            balance: Math.max(value - paid, 0),
          })
          return
        }
        updatePayment(bill.id, {
          paidAmount: value,
          balance: Math.max(bill.amount - value, 0),
          status: value >= bill.amount && bill.amount > 0 ? "paid" : bill.status,
        })
      }}
    />
  )
}
