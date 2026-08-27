"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentPhoto } from "@/components/student-photo"
import { ClassBadge } from "@/components/status-badge"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { formatTime, fullName, matchesQuery, todayISO } from "@/lib/format"
import type { ClassType, Student } from "@/lib/types"
import { CLASS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const TYPES: ClassType[] = ["modeling", "acting", "subscriber"]

export default function CheckInPage() {
  const { students, attendance, checkIn } = useStore()
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
    toast.success(`${fullName(picked)} — ${CLASS_LABELS[type]}`)
    setPicked(null)
    setQuery("")
  }

  return (
    <div>
      <PageHeader
        eyebrow="Floor"
        title="Check-in"
        description="Type a name. Tap the student. Choose Modeling, Acting, or Subscriber. That's the whole flow."
      />

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
              Start typing — the list appears as soon as it matches.
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
                    <span className="truncate font-medium">{fullName(student)}</span>
                    <span className="flex items-center gap-2">
                      <ClassBadge type={row.classType} />
                      <span className={cn("tabular-nums text-muted-foreground")}>
                        {formatTime(row.checkedInAt)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
