"use client"

import { useMemo } from "react"
import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { PhotoshootBadge } from "@/components/status-badge"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { fullName } from "@/lib/format"
import { PHOTO_LABELS } from "@/lib/constants"
import type { PhotoshootStatus } from "@/lib/types"

const COLUMNS: PhotoshootStatus[] = ["scheduled", "headshots", "full", "refresh", "received"]

export default function PhotoshootsPage() {
  const { students } = useStore()

  const byStatus = useMemo(() => {
    const map = {} as Record<PhotoshootStatus, typeof students>
    for (const status of COLUMNS) {
      map[status] = students.filter((s) => s.photoshootStatus === status)
    }
    return map
  }, [students])

  const none = students.filter((s) => s.photoshootStatus === "none" && s.program === "academy")

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Photoshoots"
        description="May shoot list, full/headshot/refresh flags from the subscriber sheet, and anyone still waiting on a first look."
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {COLUMNS.map((status) => (
          <Panel key={status}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-2xl">{PHOTO_LABELS[status]}</h2>
              <span className="text-xs text-muted-foreground">{byStatus[status].length}</span>
            </div>
            {byStatus[status].length === 0 ? (
              <p className="text-sm text-muted-foreground">Empty.</p>
            ) : (
              <ul className="grid gap-2">
                {byStatus[status].map((student) => (
                  <li key={student.id}>
                    <Link
                      href={`/students/${student.id}`}
                      className="flex items-center gap-3 rounded-lg p-1 hover:bg-muted/50"
                    >
                      <StudentPhoto student={student} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{fullName(student)}</span>
                        {student.photoshootNotes ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {student.photoshootNotes}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>

      <Panel className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-2xl">Academy — no shoot on file</h2>
          <PhotoshootBadge status="none" />
        </div>
        {none.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone on the academy roster has a shoot status.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {none.length} academy students still marked “not scheduled.” Open a profile to move them
            onto the calendar.
          </p>
        )}
      </Panel>
    </div>
  )
}
