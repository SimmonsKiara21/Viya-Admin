"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { toast } from "sonner"
import { StudentPhoto } from "@/components/student-photo"
import { PhotoshootBadge } from "@/components/status-badge"
import { Field, NativeSelect, PageHeader, Panel } from "@/components/ui-helpers"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { fullName, matchesQuery } from "@/lib/format"
import { PHOTO_LABELS } from "@/lib/constants"
import type { PhotoshootStatus } from "@/lib/types"

const COLUMNS: PhotoshootStatus[] = ["scheduled", "headshots", "full", "refresh", "received"]

export default function PhotoshootsPage() {
  const { students, updateStudent } = useStore()
  const [query, setQuery] = useState("")
  const [addStatus, setAddStatus] = useState<PhotoshootStatus>("scheduled")

  const byStatus = useMemo(() => {
    const map = {} as Record<PhotoshootStatus, typeof students>
    for (const status of COLUMNS) {
      map[status] = students.filter((s) => s.photoshootStatus === status)
    }
    return map
  }, [students])

  const none = students.filter((s) => s.photoshootStatus === "none")
  const hits = useMemo(() => {
    const pool = query.trim() ? students.filter((s) => matchesQuery(s, query)) : none
    return [...pool]
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .slice(0, query.trim() ? 12 : 8)
  }, [query, students, none])

  function setStatus(id: string, status: PhotoshootStatus) {
    const student = students.find((s) => s.id === id)
    updateStudent(id, { photoshootStatus: status })
    toast.success(
      status === "none"
        ? `${student ? fullName(student) : "Student"} was removed from photoshoots.`
        : `${student ? fullName(student) : "Student"} moved to ${PHOTO_LABELS[status]}.`,
    )
    if (query.trim()) setQuery("")
  }

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Photoshoots"
        description="Add or remove people on this tab. Search, tap a name, or move someone with the list dropdown."
      />

      <Panel className="mb-6 grid gap-3">
        <h2 className="font-heading text-2xl">Add or move someone</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Field label="Student">
            <Input
              placeholder="Search name, ID, phone, or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label="Put them in">
            <NativeSelect
              value={addStatus}
              onChange={(e) => setAddStatus(e.target.value as PhotoshootStatus)}
            >
              {COLUMNS.map((status) => (
                <option key={status} value={status}>
                  {PHOTO_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={hits.length === 0}
              onClick={() => hits[0] && setStatus(hits[0].id, addStatus)}
            >
              Add
            </Button>
          </div>
        </div>
        {hits.length > 0 ? (
          <ul className="overflow-hidden rounded-xl border border-border">
            {hits.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setStatus(s.id, addStatus)}
                >
                  <span>
                    {fullName(s)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {PHOTO_LABELS[s.photoshootStatus]}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Add to {PHOTO_LABELS[addStatus]}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() ? (
          <p className="text-sm text-muted-foreground">No matching student.</p>
        ) : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {COLUMNS.map((status) => (
          <Panel key={status}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-2xl">{PHOTO_LABELS[status]}</h2>
              <span className="text-xs text-muted-foreground">{byStatus[status].length}</span>
            </div>
            {byStatus[status].length === 0 ? (
              <p className="text-sm text-muted-foreground">Empty — search above to add someone.</p>
            ) : (
              <ul className="grid gap-2">
                {byStatus[status].map((student) => (
                  <li key={student.id} className="flex items-center gap-2">
                    <Link
                      href={`/students/${student.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-muted/50"
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
                    <NativeSelect
                      aria-label={`Move ${fullName(student)}`}
                      className="h-8 w-[9.5rem] shrink-0 text-xs"
                      value={student.photoshootStatus}
                      onChange={(e) => setStatus(student.id, e.target.value as PhotoshootStatus)}
                    >
                      {COLUMNS.map((option) => (
                        <option key={option} value={option}>
                          {PHOTO_LABELS[option]}
                        </option>
                      ))}
                      <option value="none">Remove</option>
                    </NativeSelect>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Remove from this list"
                      onClick={() => setStatus(student.id, "none")}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>

      <Panel className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-2xl">Not on a shoot list</h2>
          <PhotoshootBadge status="none" />
        </div>
        {none.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone has a shoot status.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {none.length} people are unmarked. Tap a name to add them to {PHOTO_LABELS[addStatus]},
              or open their file.
            </p>
            <div className="flex flex-wrap gap-2">
              {none.slice(0, 40).map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setStatus(student.id, addStatus)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50 hover:bg-primary/10"
                >
                  {fullName(student)}
                </button>
              ))}
              {none.length > 40 ? (
                <span className="self-center text-xs text-muted-foreground">+{none.length - 40} more — search above</span>
              ) : null}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
