"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PaymentBadge } from "@/components/status-badge"
import { formatDate, formatMoney, fullName, todayISO } from "@/lib/format"
import { buildPaymentSchedule, paymentSourceLabel } from "@/lib/schedule"
import type { PaymentRecord, PaymentStatus, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DOT: Record<PaymentStatus, string> = {
  paid: "bg-emerald-500",
  due: "bg-sky-500",
  overdue: "bg-rose-500",
  declined: "bg-rose-600",
  scheduled: "bg-zinc-400",
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month, 1))
}

function isoFor(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function PaymentMiniCalendar({
  student,
  payments,
  open,
  onOpenChange,
}: {
  student: Student | undefined
  payments: PaymentRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const today = todayISO()
  const schedule = useMemo(
    () => (student ? buildPaymentSchedule(student, payments) : []),
    [student, payments],
  )
  const initial = schedule.find((row) => row.status !== "paid" && row.date)?.date || schedule.find((row) => row.date)?.date || today
  const [cursor, setCursor] = useState(() => {
    const [y, m] = (initial || today).slice(0, 7).split("-").map(Number)
    return { year: y || new Date().getFullYear(), month: (m || 1) - 1 }
  })

  const days = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const startPad = first.getDay()
    const lastDate = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const cells: Array<{ day: number | null; iso: string }> = []
    for (let i = 0; i < startPad; i++) cells.push({ day: null, iso: "" })
    for (let day = 1; day <= lastDate; day++) {
      cells.push({ day, iso: isoFor(cursor.year, cursor.month, day) })
    }
    return cells
  }, [cursor])

  const byDay = useMemo(() => {
    const map = new Map<string, typeof schedule>()
    for (const row of schedule) {
      const key = (row.date || "").slice(0, 10)
      if (!key) continue
      const list = map.get(key) || []
      list.push(row)
      map.set(key, list)
    }
    return map
  }, [schedule])

  const monthBills = schedule
    .filter((row) => (row.date || "").startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{fullName(student)}</DialogTitle>
          <DialogDescription>
            Enrollment plan dates with Square invoices and any desk rows on the same calendar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              setCursor((c) =>
                c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
              )
            }
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm font-medium">{monthLabel(cursor.year, cursor.month)}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              setCursor((c) =>
                c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
              )
            }
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
          {days.map((cell, i) => {
            const bills = cell.iso ? byDay.get(cell.iso) || [] : []
            return (
              <div
                key={cell.iso || `pad-${i}`}
                className={cn(
                  "min-h-10 rounded-lg p-1 text-xs",
                  cell.day ? "bg-muted/40" : "",
                  cell.iso === today && "ring-1 ring-primary/50",
                )}
              >
                {cell.day ? <span className="text-muted-foreground">{cell.day}</span> : null}
                {bills.length ? (
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {bills.map((bill, index) => (
                      <span
                        key={`${bill.date}-${bill.source}-${index}`}
                        className={cn("size-1.5 rounded-full", DOT[bill.status])}
                        title={`${paymentSourceLabel(bill.source)} · ${formatMoney(bill.amount)} · ${bill.status}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Square invoices, enrollment next-payment dates, and desk rows share this month.
        </p>
        {monthBills.length === 0 ? (
          <p className="text-xs text-muted-foreground">No payments dated this month.</p>
        ) : (
          <ul className="max-h-40 space-y-2 overflow-auto text-sm">
            {monthBills.map((bill, index) => (
              <li key={`${bill.date}-${bill.source}-${index}`} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate">
                    {formatDate(bill.date)} · {formatMoney(bill.amount)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {paymentSourceLabel(bill.source)} · {bill.label}
                  </p>
                </div>
                <PaymentBadge status={bill.status} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
