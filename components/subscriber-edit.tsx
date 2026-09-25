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
import { DESK_SUB_STATUSES, SUB_LABELS } from "@/lib/constants"
import { markSubscriberCurrent, removeFromSubscribers } from "@/lib/desk-subscribers"
import { overdueSincePatch } from "@/lib/alerts"
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
  const [since, setSince] = useState(bill.overdueSince)
  const [amount, setAmount] = useState(bill.amount != null ? String(bill.amount) : "")

  function openEditor() {
    const next = subscriberBilling(student, payments)
    setStatus(student.subscriptionStatus)
    setPaid(next.lastPaidDate)
    setDue(next.nextDue)
    setSince(next.overdueSince)
    setAmount(next.amount != null ? String(next.amount) : "")
    setOpen(true)
  }

  function save() {
    if (status === "cancelled") {
      updateStudent(student.id, removeFromSubscribers(student))
      toast.success(`${student.firstName} is off Subscriptions and in Contacts.`)
      setOpen(false)
      return
    }
    const value = amount.trim() === "" ? null : Number(amount)
    const nextAmount = value != null && Number.isFinite(value) ? value : null
    const current = status === "active" && !since
    updateStudent(student.id, {
      ...(current ? markSubscriberCurrent(student) : {}),
      subscriptionStatus: status,
      nextPaymentDate: due,
      nextPaymentAmount: nextAmount,
      ...overdueSincePatch(student, since),
      deskLocks: {
        ...student.deskLocks,
        subscription: true,
        overdueSince: Boolean(since),
        status: current || student.deskLocks?.status,
      },
    })
    if (paid) {
      const paidAmount = nextAmount ?? bill.amount ?? SUBSCRIPTION_ITEM.price ?? 51.49
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
                {status === "none" || status === "cancelled" ? (
                  <option value={status}>{SUB_LABELS[status]}</option>
                ) : null}
                {DESK_SUB_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {SUB_LABELS[key]}
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
              <Field label="Overdue since" className="sm:col-span-2">
                <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
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
            {student.enrollmentStatus === "overdue" || student.enrollmentStatus === "declined" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  updateStudent(student.id, markSubscriberCurrent(student))
                  toast.success(`${student.firstName} is current again.`)
                  setOpen(false)
                }}
              >
                Make current
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                updateStudent(student.id, removeFromSubscribers(student))
                toast.success(`${student.firstName} is off Subscriptions and in Contacts.`)
                setOpen(false)
              }}
            >
              Remove from subscribers
            </Button>
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
