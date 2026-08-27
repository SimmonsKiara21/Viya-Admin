"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { NotifyComposer } from "@/components/notify-composer"
import { useStore } from "@/lib/store"
import { upcomingAcademyClasses } from "@/lib/alerts"
import { formatDate } from "@/lib/format"

type ResourcePayload = {
  source: string
  updatedAt: string
  unlocked: boolean
  headline: string
  sessions: Array<{
    title: string
    day: string
    start?: string
    end?: string
    display?: string
    notes?: string
  }>
  notes: string[]
  error?: string
}

export default function ClassesPage() {
  const { students } = useStore()
  const upcoming = upcomingAcademyClasses()
  const academy = useMemo(
    () => students.filter((s) => s.program === "academy" && s.enrollmentStatus === "current"),
    [students],
  )
  const subscribers = useMemo(
    () =>
      students.filter(
        (s) => s.program === "subscriber" && ["current", "overdue"].includes(s.enrollmentStatus),
      ),
    [students],
  )
  const [preset, setPreset] = useState<"academy" | "subscriber">("academy")
  const [resources, setResources] = useState<ResourcePayload | null>(null)

  useEffect(() => {
    fetch("/api/subscriber-classes")
      .then((r) => r.json())
      .then(setResources)
      .catch(() =>
        setResources({
          source: "https://www.viyatalent.com/talentresources",
          updatedAt: "",
          unlocked: false,
          headline: "Subscriber classes",
          sessions: [],
          notes: ["Could not load Talent Resources."],
        }),
      )
  }, [])

  const picked = preset === "academy" ? academy : subscribers
  const templateId = preset === "academy" ? "weekly-academy" : "weekly-subscriber"

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Classes"
        description="Academy meets Wednesday 7:30–8:30pm and Saturday 4:00–5:00pm. Send the weekly reminder, then check subscriber times from Talent Resources."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {upcoming.map((session) => (
          <Panel key={session.id}>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">{session.kind}</p>
            <h2 className="font-heading text-3xl">{session.display}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Next class {formatDate(session.dateISO)} · Phoenix time
            </p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-2xl">Subscriber classes</h2>
          <a
            href="https://www.viyatalent.com/talentresources"
            className="text-xs text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            viyatalent.com/talentresources
          </a>
        </div>
        {resources == null ? (
          <p className="text-sm text-muted-foreground">Loading Talent Resources…</p>
        ) : resources.sessions.length === 0 ? (
          <EmptyState
            title={resources.unlocked ? "No class times listed yet" : "Talent Resources is locked"}
            description={
              resources.notes[0] ||
              "Open the password page on viyatalent.com if you need the live schedule while we refresh."
            }
          />
        ) : (
          <ul className="grid gap-3">
            {resources.sessions.map((session, i) => (
              <li key={`${session.title}-${i}`} className="rounded-xl border border-border p-3">
                <p className="font-medium">{session.title}</p>
                <p className="text-sm text-muted-foreground">
                  {session.display || [session.day, session.start, session.end].filter(Boolean).join(" · ")}
                </p>
                {session.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">{session.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {resources?.notes?.length && resources.sessions.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {resources.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={preset === "academy" ? "default" : "outline"} onClick={() => setPreset("academy")}>
          Academy weekly ({academy.length})
        </Button>
        <Button
          size="sm"
          variant={preset === "subscriber" ? "default" : "outline"}
          onClick={() => setPreset("subscriber")}
        >
          Subscriber weekly ({subscribers.length})
        </Button>
      </div>

      <Panel>
        <h2 className="mb-4 font-heading text-2xl">
          {preset === "academy" ? "Send academy class reminder" : "Send subscriber class reminder"}
        </h2>
        <NotifyComposer
          key={preset}
          presetStudents={picked}
          initialTemplateId={templateId}
        />
      </Panel>
    </div>
  )
}
