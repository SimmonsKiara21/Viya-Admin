import { academyDateISO, newId } from "./format"
import type { CalendarEvent } from "./types"

export function normalizeCalendarEvent(event: Partial<CalendarEvent> & Pick<CalendarEvent, "date" | "title">): CalendarEvent {
  return {
    id: event.id || newId("cal"),
    date: (event.date || "").slice(0, 10),
    title: (event.title || "").trim() || "Desk date",
    notes: event.notes || "",
    studentIds: [...new Set((event.studentIds || []).filter(Boolean))],
    remind: Boolean(event.remind),
  }
}

export function eventsOnDate(events: CalendarEvent[], date: string) {
  return events.filter((event) => event.date === date).sort((a, b) => a.title.localeCompare(b.title))
}

export function reminderEventsOnDate(events: CalendarEvent[], date = academyDateISO()) {
  return eventsOnDate(events, date).filter((event) => event.remind)
}

export function datesWithEvents(events: CalendarEvent[]) {
  return new Set(events.map((event) => event.date).filter(Boolean))
}
