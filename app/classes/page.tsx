"use client"

import { useEffect, useState } from "react"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { upcomingAcademyClasses } from "@/lib/alerts"
import { formatDate } from "@/lib/format"

type ResourcePayload = {
  source: string
  updatedAt: string
  unlocked: boolean
  headline: string
  banner?: string
  academy?: {
    saturday: { time: string; august: Array<{ date: string; focus: string }> }
    wednesday: { time: string; august: Array<{ date: string; focus: string }> }
  }
  sessions: Array<{
    title: string
    kind?: string
    day: string
    date?: string
    start?: string
    end?: string
    display?: string
    notes?: string
  }>
  notes: string[]
}

export default function ClassesPage() {
  const upcoming = upcomingAcademyClasses()
  const [resources, setResources] = useState<ResourcePayload | null>(null)

  useEffect(() => {
    fetch("/api/subscriber-classes")
      .then((r) => r.json())
      .then(setResources)
      .catch(() => setResources(null))
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="Talent Resources"
        title="Classes"
        description="Academy: Wednesday 7:30–8:30pm and Saturday 4:00–5:00pm, rotating Acting and Modeling. Subscribers also have Saturday 1:30–3:30pm workshops."
      />

      {resources?.banner ? (
        <p className="mb-4 rounded-2xl border border-[oklch(0.78_0.08_85/0.35)] bg-[oklch(0.78_0.08_85/0.1)] px-4 py-3 text-sm">
          {resources.banner}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {upcoming.map((session) => (
          <Panel key={session.id}>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Next {session.weekdayLabel}
            </p>
            <h2 className="font-heading text-xl">{session.display}</h2>
            <p className="mt-2 font-medium text-primary">
              {session.focus === "acting" ? "Acting" : "Modeling"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(session.dateISO)} · Phoenix
            </p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl">Subscriber workshops</h2>
          <a
            href="https://www.viyatalent.com/talentresources"
            className="text-xs text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            From Talent Resources
          </a>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Saturday 1:30–3:30pm, before academy at 4pm.</p>
        <ul className="grid gap-3">
          {(resources?.sessions ?? []).map((session, i) => (
            <li key={`${session.title}-${i}`} className="rounded-xl border border-border p-3">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {session.kind === "acting" ? "Acting" : session.kind === "modeling" ? "Modeling" : "Workshop"}
              </p>
              <p className="font-medium">{session.title}</p>
              <p className="text-sm text-muted-foreground">{session.display}</p>
              {session.notes ? (
                <p className="mt-1 text-xs text-muted-foreground">{session.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
        {resources?.notes?.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {resources.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {resources?.academy ? (
        <Panel className="mb-6">
          <h2 className="mb-3 font-heading text-xl">August academy rotation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                Wednesday 7:30pm
              </p>
              <ul className="text-sm">
                {resources.academy.wednesday.august.map((row) => (
                  <li key={row.date} className="flex justify-between border-b border-border/60 py-1">
                    <span>{formatDate(row.date)}</span>
                    <span>{row.focus === "acting" ? "Acting" : "Modeling"}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                Saturday 4pm
              </p>
              <ul className="text-sm">
                {resources.academy.saturday.august.map((row) => (
                  <li key={row.date} className="flex justify-between border-b border-border/60 py-1">
                    <span>{formatDate(row.date)}</span>
                    <span>{row.focus === "acting" ? "Acting" : "Modeling"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
