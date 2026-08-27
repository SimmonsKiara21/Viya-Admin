"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { NotifyComposer } from "@/components/notify-composer"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { formatDateTime, fullName } from "@/lib/format"

export default function NotifyPage() {
  const { notifications, students } = useStore()
  const [preset, setPreset] = useState<"none" | "overdue" | "pending" | "due" | "academy" | "subscriber">(
    "none",
  )

  const presetStudents = useMemo(() => {
    if (preset === "overdue") {
      return students.filter((s) => ["overdue", "declined", "collections"].includes(s.enrollmentStatus))
    }
    if (preset === "pending") {
      return students.filter((s) => s.enrollmentStatus === "pending")
    }
    if (preset === "due") {
      return students.filter(
        (s) => s.nextPaymentDate && s.nextPaymentDate <= "2026-09-05" && s.enrollmentStatus === "current",
      )
    }
    if (preset === "academy") {
      return students.filter((s) => s.program === "academy" && s.enrollmentStatus === "current")
    }
    if (preset === "subscriber") {
      return students.filter((s) => s.program === "subscriber" && s.enrollmentStatus === "current")
    }
    return []
  }, [preset, students])

  const templateForPreset =
    preset === "overdue"
      ? "overdue-sms"
      : preset === "academy"
        ? "weekly-academy"
        : preset === "subscriber"
          ? "weekly-subscriber"
          : undefined

  return (
    <div>
      <PageHeader
        eyebrow="Outreach"
        title="Text & Gmail"
        description="Send a payment nudge, class reminder, or photoshoot note. One student opens your phone or Gmail. Groups stay in the outbox until Textla or Gmail is connected."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={preset === "none" ? "default" : "outline"} onClick={() => setPreset("none")}>
          Pick people
        </Button>
        <Button size="sm" variant={preset === "overdue" ? "default" : "outline"} onClick={() => setPreset("overdue")}>
          Overdue / declined
        </Button>
        <Button size="sm" variant={preset === "pending" ? "default" : "outline"} onClick={() => setPreset("pending")}>
          Pending starts
        </Button>
        <Button size="sm" variant={preset === "due" ? "default" : "outline"} onClick={() => setPreset("due")}>
          Due by Sep 5
        </Button>
        <Button
          size="sm"
          variant={preset === "academy" ? "default" : "outline"}
          onClick={() => setPreset("academy")}
        >
          Weekly academy class
        </Button>
        <Button
          size="sm"
          variant={preset === "subscriber" ? "default" : "outline"}
          onClick={() => setPreset("subscriber")}
        >
          Weekly subscriber class
        </Button>
      </div>

      <Panel className="mb-8">
        <NotifyComposer
          key={preset + presetStudents.map((s) => s.id).join(",")}
          presetStudents={presetStudents}
          initialTemplateId={templateForPreset}
        />
      </Panel>

      <h2 className="mb-3 font-heading text-3xl">Outbox</h2>
      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing sent yet"
          description="Reminders you send are stored here so you can see who already got a Square or Textla nudge."
        />
      ) : (
        <ul className="grid gap-3">
          {notifications.map((n) => (
            <li key={n.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {n.channel === "sms" ? "Text" : "Email"} · {n.status} · {formatDateTime(n.sentAt)}
                </span>
                <span>{n.studentIds.length} recipient{n.studentIds.length === 1 ? "" : "s"}</span>
              </div>
              {n.subject ? <p className="mt-2 font-medium">{n.subject}</p> : null}
              <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{n.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {n.studentIds
                  .map((id) => {
                    const s = students.find((x) => x.id === id)
                    return s ? fullName(s) : id
                  })
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
