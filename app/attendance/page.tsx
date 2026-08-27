"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ClassBadge } from "@/components/status-badge"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { countsFor, useStore } from "@/lib/store"
import { formatDate, formatTime, fullName } from "@/lib/format"
import { CLASS_LABELS } from "@/lib/constants"
import type { ClassType } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function AttendancePage() {
  const { attendance, students } = useStore()
  const [type, setType] = useState<ClassType | "all">("all")

  const filtered = useMemo(() => {
    const rows = type === "all" ? attendance : attendance.filter((a) => a.classType === type)
    return [...rows].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))
  }, [attendance, type])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const row of filtered) {
      const day = row.checkedInAt.slice(0, 10)
      const list = map.get(day) ?? []
      list.push(row)
      map.set(day, list)
    }
    return [...map.entries()]
  }, [filtered])

  const totals = countsFor(attendance)

  return (
    <div>
      <PageHeader
        eyebrow="Classes"
        title="Attendance"
        description="Modeling and acting are tracked separately, the same way the check-in sheet splits the floor."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs text-muted-foreground uppercase">Modeling</p>
          <p className="font-heading text-4xl">{totals.modeling}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-muted-foreground uppercase">Acting</p>
          <p className="font-heading text-4xl">{totals.acting}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-muted-foreground uppercase">Subscriber</p>
          <p className="font-heading text-4xl">{totals.subscriber}</p>
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
                ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                : "border-border text-muted-foreground",
            )}
          >
            {t === "all" ? "All classes" : CLASS_LABELS[t]}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          title="No attendance yet"
          description="Use Check-in at the door. Records from August 26 are loaded from the tracker you uploaded."
        />
      ) : (
        <div className="grid gap-4">
          {grouped.map(([day, rows]) => (
            <Panel key={day}>
              <h2 className="mb-3 font-heading text-2xl">{formatDate(day)}</h2>
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
