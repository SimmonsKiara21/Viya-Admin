"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, X } from "lucide-react"
import { toast } from "sonner"
import { StudentPhoto } from "@/components/student-photo"
import { Field, NativeSelect, PageHeader, Panel } from "@/components/ui-helpers"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { fullName, matchesQuery } from "@/lib/format"
import { PHOTO_LABELS } from "@/lib/constants"
import { PHOTO_COLUMNS } from "@/lib/photoshoots"
import type { PhotoshootStatus } from "@/lib/types"

export default function PhotoshootsPage() {
  const { students, photoshoots, photoshootPlacements, setPhotoshootPlacement, addPhotoshoot } = useStore()
  const [query, setQuery] = useState("")
  const [addStatus, setAddStatus] = useState<Exclude<PhotoshootStatus, "none">>("scheduled")
  const openShoots = photoshoots.filter((s) => !s.archived)
  const priorShoots = photoshoots.filter((s) => s.archived)
  const [shootId, setShootId] = useState(openShoots[0]?.id || photoshoots[0]?.id || "2026-09")
  const [priorOpen, setPriorOpen] = useState(false)

  const shoot = photoshoots.find((s) => s.id === shootId) ?? openShoots[0]
  const currentId = shoot?.id || shootId

  const byStatus = useMemo(() => {
    const map = {} as Record<(typeof PHOTO_COLUMNS)[number], typeof students>
    for (const status of PHOTO_COLUMNS) {
      const ids = photoshootPlacements
        .filter((row) => row.shootId === currentId && row.status === status)
        .map((row) => row.studentId)
      map[status] = students.filter((s) => ids.includes(s.id))
    }
    return map
  }, [students, photoshootPlacements, currentId])

  const onThisShoot = new Set(
    photoshootPlacements.filter((row) => row.shootId === currentId).map((row) => row.studentId),
  )
  const none = students.filter((s) => !onThisShoot.has(s.id))
  const hits = useMemo(() => {
    const pool = query.trim() ? students.filter((s) => matchesQuery(s, query)) : none
    return [...pool]
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .slice(0, query.trim() ? 12 : 8)
  }, [query, students, none])

  function setStatus(id: string, status: PhotoshootStatus) {
    const student = students.find((s) => s.id === id)
    setPhotoshootPlacement(id, currentId, status)
    toast.success(
      status === "none"
        ? `${student ? fullName(student) : "Student"} was removed from ${shoot?.label || "this shoot"}.`
        : `${student ? fullName(student) : "Student"} moved to ${PHOTO_LABELS[status]} · ${shoot?.label}.`,
    )
    if (query.trim()) setQuery("")
  }

  function statusOnShoot(studentId: string): PhotoshootStatus {
    return photoshootPlacements.find((row) => row.studentId === studentId && row.shootId === currentId)?.status ?? "none"
  }

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Photoshoots"
        description="Each month has its own Scheduled, Headshots, Full, Refresh, and Received lists. Prior months stay collapsed until you open them."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              const created = addPhotoshoot()
              setShootId(created.id)
              toast.success(`${created.label} is ready.`)
            }}
          >
            Add next month
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {openShoots.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setShootId(item.id)}
            className={
              currentId === item.id
                ? "rounded-full border border-primary/50 bg-primary/16 px-3 py-1 text-xs font-medium text-primary"
                : "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {priorShoots.length > 0 ? (
        <Panel className="mb-6 p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left"
            onClick={() => setPriorOpen((v) => !v)}
          >
            <span>
              <span className="font-heading text-2xl">Prior shoots</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {priorShoots.map((s) => s.label.replace(" 2026", "")).join(" · ")}
              </span>
            </span>
            <ChevronDown className={`size-4 text-muted-foreground transition ${priorOpen ? "rotate-180" : ""}`} />
          </button>
          {priorOpen ? (
            <div className="border-t border-border px-5 py-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Open a past month to see who was on Scheduled, Headshots, Full, Refresh, or Received.
              </p>
              <div className="flex flex-wrap gap-2">
                {priorShoots.map((item) => {
                  const count = photoshootPlacements.filter((row) => row.shootId === item.id).length
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setShootId(item.id)}
                      className={
                        currentId === item.id
                          ? "rounded-full border border-primary/50 bg-primary/16 px-3 py-1 text-xs font-medium text-primary"
                          : "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      }
                    >
                      {item.label} · {count}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <Panel className="mb-6 grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-heading text-2xl">{shoot?.label || "This month"}</h2>
          {shoot?.archived ? (
            <span className="text-xs text-muted-foreground">Archived month — view or copy names into a new shoot.</span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Field label="Student or contact">
            <Input
              placeholder="Search name, ID, phone, or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label="Put them in">
            <NativeSelect
              value={addStatus}
              onChange={(e) => setAddStatus(e.target.value as Exclude<PhotoshootStatus, "none">)}
            >
              {PHOTO_COLUMNS.map((status) => (
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
                      {PHOTO_LABELS[statusOnShoot(s.id)]}
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
        {PHOTO_COLUMNS.map((status) => (
          <Panel key={status}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-2xl">{PHOTO_LABELS[status]}</h2>
              <span className="text-xs text-muted-foreground">{byStatus[status].length}</span>
            </div>
            {byStatus[status].length === 0 ? (
              <p className="text-sm text-muted-foreground">Empty for {shoot?.label}.</p>
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
                      value={statusOnShoot(student.id)}
                      onChange={(e) => setStatus(student.id, e.target.value as PhotoshootStatus)}
                    >
                      {PHOTO_COLUMNS.map((option) => (
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
    </div>
  )
}
