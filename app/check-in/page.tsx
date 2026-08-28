"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentPhoto } from "@/components/student-photo"
import { ClassBadge } from "@/components/status-badge"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore, useSync } from "@/lib/store"
import { formatPhone, formatShortDate, formatTime, fullName, matchesQuery, todayISO } from "@/lib/format"
import type { ClassType, Student } from "@/lib/types"
import { CLASS_LABELS, JOTFORM_ATTENDANCE_URL } from "@/lib/constants"
import { cn } from "@/lib/utils"

const TYPES: ClassType[] = ["modeling", "acting", "subscriber"]

export default function CheckInPage() {
  const { students, attendance, checkIn } = useStore()
  const { jotform } = useSync()
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<Student | null>(null)
  const today = todayISO()

  const hits = useMemo(() => {
    if (!query.trim()) return []
    return students.filter((s) => matchesQuery(s, query)).slice(0, 8)
  }, [query, students])

  const todays = useMemo(
    () =>
      attendance
        .filter((a) => a.checkedInAt.slice(0, 10) === today)
        .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)),
    [attendance, today],
  )

  function confirm(type: ClassType) {
    if (!picked) return
    const already = todays.find((a) => a.studentId === picked.id && a.classType === type)
    if (already) {
      toast.message(`${fullName(picked)} is already checked in for ${CLASS_LABELS[type]}.`)
      return
    }
    checkIn(picked.id, type)
    toast.success(`${fullName(picked)} — ${CLASS_LABELS[type]} · posted to Jotform`)
    setPicked(null)
    setQuery("")
  }

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/jotform/webhook` : "/api/jotform/webhook"

  return (
    <div>
      <PageHeader
        eyebrow="Floor"
        title="Check-in"
        description="This is the only place to manually check someone in. Type a name, or use the same student Jotform they already fill out. Either side updates Attendance."
      />

      <Panel className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl">Jotform tracker</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {jotform.message || "Syncing the student attendance form."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Form:{" "}
              <a
                href={jotform.formUrl || JOTFORM_ATTENDANCE_URL}
                className="underline hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                Student Attendance Check-In
              </a>
              {jotform.fetchedAt ? ` · last pull ${formatTime(jotform.fetchedAt)}` : ""}
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {jotform.connected ? "API connected" : jotform.source === "webhook" ? "Webhook live" : "Syncing"}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          To receive student-phone check-ins automatically, add a Jotform webhook to{" "}
          <span className="break-all font-mono">{webhookUrl}</span>
          , or put <span className="font-mono">JOTFORM_API_KEY</span> in{" "}
          <span className="font-mono">.env.local</span>.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPicked(null)
              }}
              placeholder="Name, ID, or phone"
              className="h-14 rounded-2xl pl-11 text-lg"
              autoFocus
            />
          </div>

          {picked ? (
            <div className="mt-6">
              <div className="mb-5 flex items-center gap-4">
                <StudentPhoto student={picked} size="lg" />
                <div>
                  <p className="font-heading text-3xl">{fullName(picked)}</p>
                  <p className="text-sm text-muted-foreground">#{picked.id}</p>
                </div>
              </div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Checking in for
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {TYPES.map((type) => (
                  <Button
                    key={type}
                    size="lg"
                    variant={type === "modeling" ? "default" : "outline"}
                    className="h-16 text-base"
                    onClick={() => confirm(type)}
                  >
                    {CLASS_LABELS[type]}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" className="mt-3" onClick={() => setPicked(null)}>
                Choose someone else
              </Button>
            </div>
          ) : hits.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {hits.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-3 text-left hover:bg-muted/40"
                    onClick={() => setPicked(student)}
                  >
                    <StudentPhoto student={student} size="md" />
                    <span>
                      <span className="block font-medium">{fullName(student)}</span>
                      <span className="text-xs text-muted-foreground">#{student.id}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <p className="mt-6 text-sm text-muted-foreground">No match. Try a first name or the last four of the ID.</p>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Start typing — the list appears as soon as it matches. Staff check-ins also post to the Jotform tracker.
            </p>
          )}
        </Panel>

        <Panel>
          <h2 className="font-heading text-2xl">Today</h2>
          <p className="mb-4 text-sm text-muted-foreground">{todays.length} checked in</p>
          {todays.length === 0 ? (
            <EmptyState
              title="Class has not started"
              description="Last session (Aug 26) is on the Attendance tab if you need a roll call."
            />
          ) : (
            <ul className="grid gap-2">
              {todays.map((row) => {
                const student = students.find((s) => s.id === row.studentId)
                if (!student) return null
                return (
                  <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{fullName(student)}</span>
                    <span className="flex items-center gap-2">
                      <ClassBadge type={row.classType} />
                      <span className={cn("tabular-nums text-muted-foreground")}>
                        {formatShortDate(row.checkedInAt)} · {formatTime(row.checkedInAt)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {jotform.unmatched.length > 0 ? (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-medium">On the form, not on the roster</h3>
              <ul className="mt-2 grid gap-1.5 text-sm">
                {jotform.unmatched.slice(0, 8).map((row) => (
                  <li key={row.id} className="text-muted-foreground">
                    {row.firstName} {row.lastName}
                    {row.phone ? ` · ${formatPhone(row.phone)}` : ""} · {CLASS_LABELS[row.classType]}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel className="mt-6 overflow-hidden p-0">
        <div className="px-5 pt-5">
          <h2 className="font-heading text-2xl">Student form</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Same Jotform they use on their phones. A submit here lands on the tracker and on this desk.
          </p>
        </div>
        <iframe
          title="Student Attendance Check-In"
          src={`${JOTFORM_ATTENDANCE_URL}?isIframeEmbed=1`}
          className="h-[560px] w-full border-0 bg-card"
        />
      </Panel>
    </div>
  )
}
