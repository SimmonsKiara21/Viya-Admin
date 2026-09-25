"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui-helpers"
import { fullName, matchesQuery } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { CalendarEvent } from "@/lib/types"

type Form = {
  date: string
  title: string
  notes: string
  remind: boolean
  studentIds: string[]
  query: string
}

function fromEvent(event: Partial<CalendarEvent> | null, fallbackDate: string): Form {
  return {
    date: event?.date || fallbackDate,
    title: event?.title || "",
    notes: event?.notes || "",
    remind: Boolean(event?.remind),
    studentIds: event?.studentIds || [],
    query: "",
  }
}

export function CalendarEventEditor({
  open,
  event,
  defaultDate,
  onClose,
}: {
  open: boolean
  event: CalendarEvent | null
  defaultDate: string
  onClose: () => void
}) {
  const { students, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, addNotification } = useStore()
  const [form, setForm] = useState<Form>(() => fromEvent(event, defaultDate))

  useEffect(() => {
    if (!open) return
    setForm(fromEvent(event, defaultDate))
  }, [open, event, defaultDate])

  const hits = useMemo(() => {
    const q = form.query.trim()
    return students
      .filter((student) => (q ? matchesQuery(student, q) : form.studentIds.includes(student.id)))
      .slice(0, 40)
  }, [students, form.query, form.studentIds])

  function toggle(id: string) {
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter((item) => item !== id)
        : [...prev.studentIds, id],
    }))
  }

  function save() {
    const title = form.title.trim()
    if (!title) {
      toast.error("Give this date a name.")
      return
    }
    if (!form.date) {
      toast.error("Pick a date.")
      return
    }
    const payload = {
      date: form.date,
      title,
      notes: form.notes.trim(),
      remind: form.remind,
      studentIds: form.studentIds,
    }
    if (event) updateCalendarEvent(event.id, payload)
    else addCalendarEvent(payload)
    toast.success(event ? "Saved this date." : "Added this date to the calendar.")
    onClose()
  }

  function sendNow() {
    const title = form.title.trim() || "Desk reminder"
    const picked = students.filter((student) => form.studentIds.includes(student.id))
    addNotification({
      studentIds: form.studentIds,
      channel: "email",
      subject: title,
      body: form.notes.trim() || `${title} on ${form.date}.`,
      status: "demo",
    })
    toast.success(
      picked.length
        ? `Reminder logged on the desk for ${picked.length} people.`
        : "Reminder logged on the desk for this date.",
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{event ? "Edit date" : "Create date"}</DialogTitle>
          <DialogDescription>
            Add a desk date. Turn on a reminder only if you want it to show on the website that day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
          </Field>
          <Field label="Title">
            <Input
              value={form.title}
              placeholder="Class, callback, payment walk-in…"
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              placeholder="What staff should remember."
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.remind}
              onChange={(e) => setForm((prev) => ({ ...prev, remind: e.target.checked }))}
            />
            <span>
              Remind on this date
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Only if you want it. The desk will show this reminder on that day.
              </span>
            </span>
          </label>
          <Field label="People on this date">
            <Input
              value={form.query}
              placeholder="Search a name to attach"
              onChange={(e) => setForm((prev) => ({ ...prev, query: e.target.value }))}
            />
            <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
              {hits.map((student) => {
                const on = form.studentIds.includes(student.id)
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggle(student.id)}
                    className="flex items-center justify-between rounded-lg px-2 py-1 text-left text-sm hover:bg-muted"
                  >
                    <span>{fullName(student)}</span>
                    <span className="text-xs text-muted-foreground">{on ? "Added" : "Add"}</span>
                  </button>
                )
              })}
            </div>
            {form.studentIds.length ? (
              <p className="mt-1 text-xs text-muted-foreground">{form.studentIds.length} attached</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Leave empty for a general desk date.</p>
            )}
          </Field>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {event ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  deleteCalendarEvent(event.id)
                  toast.success("Removed this date.")
                  onClose()
                }}
              >
                Delete
              </Button>
            ) : null}
            {form.remind ? (
              <Button type="button" variant="outline" onClick={sendNow}>
                Send reminder now
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              {event ? "Save date" : "Save date"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
