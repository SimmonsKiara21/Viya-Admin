"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, NativeSelect } from "@/components/ui-helpers"
import { SUB_LABELS } from "@/lib/constants"
import { fullName } from "@/lib/format"
import { subscriberBilling } from "@/lib/subscriber-billing"
import { SUBSCRIPTION_ITEM } from "@/lib/square"
import { useStore } from "@/lib/store"
import type { Student, SubscriptionStatus } from "@/lib/types"

const DESK_SUB_PAID = "Desk subscription paid"

export function SubscriberQuickEdit({ student }: { student: Student }) {
  const { payments, updateStudent, addPayment, updatePayment } = useStore()
  const [open, setOpen] = useState(false)
  const bill = subscriberBilling(student, payments)
  const [status, setStatus] = useState<SubscriptionStatus>(student.subscriptionStatus)
  const [paid, setPaid] = useState(bill.lastPaidDate)
  const [due, setDue] = useState(bill.nextDue)
  const [amount, setAmount] = useState(bill.amount != null ? String(bill.amount) : "")

  function openEditor() {
    const next = subscriberBilling(student, payments)
    setStatus(student.subscriptionStatus)
    setPaid(next.lastPaidDate)
    setDue(next.nextDue)
    setAmount(next.amount != null ? String(next.amount) : "")
    setOpen(true)
  }

  function save() {
    const value = amount.trim() === "" ? null : Number(amount)
    const nextAmount = value != null && Number.isFinite(value) ? value : null
    updateStudent(student.id, {
      subscriptionStatus: status,
      nextPaymentDate: due,
      nextPaymentAmount: nextAmount,
      deskLocks: { ...student.deskLocks, subscription: true },
    })
    if (paid) {
      const paidAmount = nextAmount ?? bill.amount ?? SUBSCRIPTION_ITEM.price ?? 49.99
      const existing = payments.find(
        (payment) => payment.studentId === student.id && payment.notes === DESK_SUB_PAID,
      )
      const patch = {
        amount: paidAmount,
        paidAmount,
        balance: 0,
        dueDate: paid,
        paidDate: paid,
        status: "paid" as const,
        method: "other" as const,
        notes: DESK_SUB_PAID,
        itemId: SUBSCRIPTION_ITEM.id,
        itemName: SUBSCRIPTION_ITEM.name,
        itemDescription: "",
        itemKind: "subscriber" as const,
        source: "manual" as const,
      }
      if (existing) updatePayment(existing.id, patch)
      else addPayment({ studentId: student.id, squareInvoiceId: "", ...patch })
    }
    toast.success(`Saved ${student.firstName}'s subscription.`)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          openEditor()
        }}
      >
        <Pencil className="size-3" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit subscription</DialogTitle>
            <DialogDescription>
              Quick desk edit for {fullName(student)}. Monthly Square invoices stay as they are.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Status">
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
                {Object.entries(SUB_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Last paid">
                <Input type="date" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </Field>
              <Field label="Next due">
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
            <Field label="Monthly amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
