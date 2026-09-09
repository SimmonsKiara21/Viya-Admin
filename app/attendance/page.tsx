"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentPhoto } from "@/components/student-photo"
import { ClassBadge } from "@/components/status-badge"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { countsFor, useStore, useSync } from "@/lib/store"
import {
  academyDateISO,
  formatShortDate,
  formatTime,
  fullName,
  isSameDay,
  matchesQuery,
  todayISO,
} from "@/lib/format"
import { CLASS_LABELS, JOTFORM_ATTENDANCE_URL } from "@/lib/constants"
import type { ClassType, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPES: ClassType[] = ["modeling", "acting", "subscriber"]

export default function AttendancePage() {
  const { students, attendance, checkIn } = useStore()
  const { jotform } = useSync()
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<Student | null>(null)
  const [type, setType] = useState<ClassType | "all">("all")
  const today = todayISO()

  const hits = useMemo(() => {
    if (!query.trim()) return []
    return students.filter((s) => matchesQuery(s, query)).slice(0, 8)
  }, [query, students])

  const todays = useMemo(
    () =>
      attendance
        .filter((a) => isSameDay(a.checkedInAt, today))
        .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)),
    [attendance, today],
  )

  const filtered = useMemo(() => {
    const rows = type === "all" ? attendance : attendance.filter((a) => a.classType === type)
    return [...rows].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))
  }, [attendance, type])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const row of filtered) {
      const day = academyDateISO(row.checkedInAt)
      const list = map.get(day) ?? []
      list.push(row)
      map.set(day, list)
    }
    return [...map.entries()]
  }, [filtered])

  const totals = countsFor(attendance)

  function confirm(classType: ClassType) {
    if (!picked) return
    const already = todays.find((a) => a.studentId === picked.id && a.classType === classType)
    if (already) {
      toast.message(`${fullName(picked)} is already checked in for ${CLASS_LABELS[classType]}.`)
      return
    }
    checkIn(picked.id, classType)
    toast.success(`${fullName(picked)} — ${CLASS_LABELS[classType]}`)
    setPicked(null)
    setQuery("")
  }

  return (
    <div>
      <PageHeader
        eyebrow="Floor"
        title="Attendance"
        description="Check someone in. See who showed up. Phoenix time."
      />

      <Panel className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {jotform.message || "Syncing the tracker."}
            {jotform.fetchedAt ? ` · ${formatTime(jotform.fetchedAt)}` : ""}{" "}
            <a
              href={jotform.formUrl || JOTFORM_ATTENDANCE_URL}
              className="underline hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Student form
            </a>
          </p>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {jotform.source === "sheet"
              ? "Sheet live"
              : jotform.connected
                ? "API connected"
                : jotform.source === "webhook"
                  ? "Webhook live"
                  : "Syncing"}
          </span>
        </div>
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
                  <p className="font-heading text-2xl">{fullName(picked)}</p>
                  <p className="text-sm text-muted-foreground">#{picked.id}</p>
                </div>
              </div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Checking in for
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {TYPES.map((classType) => (
                  <Button
                    key={classType}
                    size="lg"
                    variant={classType === "modeling" ? "default" : "outline"}
                    className="h-16 text-base"
                    onClick={() => confirm(classType)}
                  >
                    {CLASS_LABELS[classType]}
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
            <p className="mt-6 text-sm text-muted-foreground">No match.</p>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Type a name to check in.</p>
          )}
        </Panel>

        <Panel>
          <h2 className="font-heading text-xl">Today</h2>
          <p className="mb-4 text-sm text-muted-foreground">{todays.length} checked in</p>
          {todays.length === 0 ? (
            <EmptyState title="Nobody yet" description="Check-ins from the desk or the student form show here." />
          ) : (
            <ul className="grid gap-2">
              {todays.map((row) => {
                const student = students.find((s) => s.id === row.studentId)
                if (!student) return null
                return (
                  <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/students/${student.id}`} className="min-w-0 truncate font-medium hover:underline">
                      {fullName(student)}
                    </Link>
                    <span className="flex items-center gap-2">
                      <ClassBadge type={row.classType} />
                      <span className="tabular-nums text-muted-foreground">{formatTime(row.checkedInAt)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-8 mb-4 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs text-muted-foreground uppercase">Modeling</p>
          <p className="font-heading text-3xl leading-none">{totals.modeling}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-muted-foreground uppercase">Acting</p>
          <p className="font-heading text-3xl leading-none">{totals.acting}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-muted-foreground uppercase">Subscriber</p>
          <p className="font-heading text-3xl leading-none">{totals.subscriber}</p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "modeling", "acting", "subscriber"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              type === t
                ? "border-primary/50 bg-primary/16 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {t === "all" ? "All classes" : CLASS_LABELS[t]}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="No attendance yet" description="Check someone in above." />
      ) : (
        <div className="grid gap-4">
          {grouped.map(([day, rows]) => (
            <Panel key={day}>
              <h2 className="mb-3 font-heading text-xl">{formatShortDate(day)}</h2>
              <ul className="divide-y divide-border">
                {rows.map((row) => {
                  const student = students.find((s) => s.id === row.studentId)
                  return (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      {student ? (
                        <Link href={`/students/${student.id}`} className="font-medium hover:underline">
                          {fullName(student)}
                        </Link>
                      ) : (
                        <span>{row.studentId}</span>
                      )}
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ClassBadge type={row.classType} />
                        <span className="tabular-nums">{formatTime(row.checkedInAt)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
