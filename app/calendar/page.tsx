"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { calendarRuns, datesWithRuns, monthGrid, runsOnDate, shiftMonth } from "@/lib/calendar"
import { formatDate, formatMoney, fullName, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
  const { students, payments } = useStore()
  const today = todayISO()
  const [cursor, setCursor] = useState(today.slice(0, 7) + "-01")
  const [selected, setSelected] = useState(today)
  const grid = monthGrid(cursor)
  const runs = useMemo(() => calendarRuns(students, payments), [students, payments])
  const marked = useMemo(() => datesWithRuns(runs), [runs])
  const dayRuns = runsOnDate(runs, selected)
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(grid.year, grid.month - 1, 1)))

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Phoenix dates from the enrollment plan and Square invoices. Desk schedule rows you add on a talent file show here too."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl">{monthLabel}</h2>
            <div className="flex gap-1">
              <Button size="icon-sm" variant="outline" onClick={() => setCursor(shiftMonth(cursor, -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCursor(`${today.slice(0, 7)}-01`)
                  setSelected(today)
                }}
              >
                Today
              </Button>
              <Button size="icon-sm" variant="outline" onClick={() => setCursor(shiftMonth(cursor, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.cells.map((cell, index) => {
              if (!cell.date) return <div key={`empty-${index}`} />
              const active = cell.date === selected
              const isToday = cell.date === today
              const hasRun = marked.has(cell.date)
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelected(cell.date!)}
                  className={cn(
                    "flex min-h-14 flex-col items-center rounded-xl border px-1 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : isToday
                        ? "border-primary/50 bg-primary/10"
                        : "border-transparent hover:bg-muted",
                  )}
                >
                  <span className="font-medium tabular-nums">{cell.day}</span>
                  {hasRun ? (
                    <span
                      className={cn(
                        "mt-1 size-1.5 rounded-full",
                        active ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-heading text-xl">{formatDate(selected)}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {dayRuns.length === 0
              ? "Nobody is scheduled to run."
              : `${dayRuns.length} scheduled to run`}
          </p>
          {dayRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Open a talent file and add a payment date if they should appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dayRuns.map((run) => (
                <li key={`${run.student.id}-${run.date}-${run.label}`} className="py-2.5">
                  <Link href={`/students/${run.student.id}`} className="font-medium hover:underline">
                    {fullName(run.student)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {run.label}
                    {run.amount != null ? ` · ${formatMoney(run.amount)}` : ""}
                    {` · ${run.status}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
