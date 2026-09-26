"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react"
import { CalendarEventEditor } from "@/components/calendar-event-editor"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { calendarRuns, datesWithRuns, monthGrid, runsOnDate, shiftMonth } from "@/lib/calendar"
import { datesWithEvents, eventsOnDate, reminderEventsOnDate } from "@/lib/calendar-events"
import { Input } from "@/components/ui/input"
import { formatDate, formatMoney, fullName, matchesQuery, todayISO } from "@/lib/format"
import type { CalendarEvent } from "@/lib/types"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
  const { students, payments, calendarEvents } = useStore()
  const today = todayISO()
  const [cursor, setCursor] = useState(today.slice(0, 7) + "-01")
  const [selected, setSelected] = useState(today)
  const [query, setQuery] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const grid = monthGrid(cursor)
  const runs = useMemo(() => calendarRuns(students, payments), [students, payments])
  const marked = useMemo(() => {
    const next = datesWithRuns(runs)
    for (const date of datesWithEvents(calendarEvents)) next.add(date)
    return next
  }, [runs, calendarEvents])
  const reminderDates = useMemo(
    () => new Set(calendarEvents.filter((event) => event.remind).map((event) => event.date)),
    [calendarEvents],
  )
  const dayRuns = runsOnDate(runs, selected).filter((run) => matchesQuery(run.student, query))
  const foundRuns = useMemo(
    () => (query.trim() ? runs.filter((run) => matchesQuery(run.student, query)) : []),
    [query, runs],
  )
  const dayEvents = eventsOnDate(calendarEvents, selected)
  const todayReminders = reminderEventsOnDate(calendarEvents, today)
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(grid.year, grid.month - 1, 1)))

  function openCreate() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event)
    setEditorOpen(true)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Phoenix dates from Square, subscriber monthly dues, desk payment rows, and dates you create here. Reminders only go out for dates you mark."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Create date
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this tab by name, ID, phone, or email"
          className="h-11 max-w-xl rounded-full px-4"
        />
      </div>

      {todayReminders.length ? (
        <Panel className="mb-6 border-primary/40 bg-primary/8">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Today’s reminders</p>
          <ul className="mt-2 grid gap-2">
            {todayReminders.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{event.title}</p>
                  {event.notes ? <p className="text-sm text-muted-foreground">{event.notes}</p> : null}
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(event)}>
                  <Pencil className="size-3" />
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

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
              const hasReminder = reminderDates.has(cell.date)
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
                  {hasRun || hasReminder ? (
                    <span
                      className={cn(
                        "mt-1 size-1.5 rounded-full",
                        hasReminder ? "bg-amber-400" : active ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl">{formatDate(selected)}</h2>
              <p className="text-sm text-muted-foreground">
                {dayEvents.length + dayRuns.length === 0
                  ? "Nothing on this date yet."
                  : `${dayEvents.length + dayRuns.length} on this date`}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={openCreate}>
              <Plus className="size-3" />
              Create
            </Button>
          </div>

          {dayEvents.length ? (
            <ul className="mb-4 divide-y divide-border">
              {dayEvents.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.remind ? "Reminder on" : "No reminder"}
                      {event.studentIds.length ? ` · ${event.studentIds.length} people` : " · desk date"}
                    </p>
                    {event.notes ? <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p> : null}
                  </div>
                  <Button type="button" size="xs" variant="outline" onClick={() => openEdit(event)}>
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {query.trim() && foundRuns.length ? (
            <ul className="mb-4 divide-y divide-border">
              {foundRuns.map((run) => (
                <li key={`${run.student.id}-${run.date}-${run.label}`} className="py-2.5">
                  <button type="button" className="text-left" onClick={() => setSelected(run.date)}>
                    <span className="font-medium">{fullName(run.student)}</span>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(run.date)}
                      {run.amount != null ? ` · ${formatMoney(run.amount)}` : ""}
                      {` · ${run.status}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : dayRuns.length === 0 && dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim()
                ? "Nobody on this calendar matches that search."
                : "Create a date, or add a payment date on a talent or subscriber file."}
            </p>
          ) : dayRuns.length ? (
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
          ) : null}
        </Panel>
      </div>

      <CalendarEventEditor
        open={editorOpen}
        event={editing}
        defaultDate={selected}
        onClose={() => {
          setEditorOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
