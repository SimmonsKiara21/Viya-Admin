"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { StudentPhoto } from "@/components/student-photo"
import { PageHeader, Panel } from "@/components/ui-helpers"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { fullName, matchesQuery } from "@/lib/format"
import { PHOTO_LABELS } from "@/lib/constants"
import { PHOTO_COLUMNS } from "@/lib/photoshoots"
import type { PhotoshootStatus, Student } from "@/lib/types"

export default function PhotoshootsPage() {
  const { students, photoshoots, photoshootPlacements, setPhotoshootPlacement, addPhotoshoot } = useStore()
  const [editing, setEditing] = useState<Partial<Record<(typeof PHOTO_COLUMNS)[number], boolean>>>({})
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
        .filter((row) => row.shootId === shootId && row.status === status)
        .map((row) => row.studentId)
      map[status] = students.filter((s) => ids.includes(s.id))
    }
    return map
  }, [students, photoshootPlacements, shootId])

  function setStatus(id: string, status: PhotoshootStatus) {
    const student = students.find((s) => s.id === id)
    setPhotoshootPlacement(id, currentId, status)
    toast.success(
      status === "none"
        ? `${student ? fullName(student) : "Talent"} was removed from ${shoot?.label || "this shoot"}.`
        : `${student ? fullName(student) : "Talent"} moved to ${PHOTO_LABELS[status]} · ${shoot?.label}.`,
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Photoshoots"
        description="May photoshoot, LA Model Source 2026, and Model Source November are filled from the Google Contacts lists. September and October stay open for the new month. June–August sit under Prior shoots."
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
        <Panel className="mb-6 p-0 overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left"
            onClick={() => setPriorOpen((v) => !v)}
          >
            <span className="min-w-0">
              <span className="font-heading text-xl">Prior shoots</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {priorShoots.map((s) => s.label.replace(" 2026", "")).join(" · ")}
              </span>
            </span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${priorOpen ? "rotate-180" : ""}`} />
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

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-heading text-xl">{shoot?.label || "This month"}</h2>
        {shoot?.archived ? (
          <span className="text-xs text-muted-foreground">Archived month — view or copy names into a new shoot.</span>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <PhotoColumn
          status="scheduled"
          people={byStatus.scheduled}
          students={students}
          editing={Boolean(editing.scheduled)}
          onToggleEdit={() => setEditing((prev) => ({ ...prev, scheduled: !prev.scheduled }))}
          onSetStatus={setStatus}
        />
        <div className="grid items-start gap-4">
          <PhotoColumn
            status="headshots"
            people={byStatus.headshots}
            students={students}
            editing={Boolean(editing.headshots)}
            onToggleEdit={() => setEditing((prev) => ({ ...prev, headshots: !prev.headshots }))}
            onSetStatus={setStatus}
          />
          <PhotoColumn
            status="refresh"
            people={byStatus.refresh}
            students={students}
            editing={Boolean(editing.refresh)}
            onToggleEdit={() => setEditing((prev) => ({ ...prev, refresh: !prev.refresh }))}
            onSetStatus={setStatus}
          />
          <PhotoColumn
            status="received"
            people={byStatus.received}
            students={students}
            editing={Boolean(editing.received)}
            onToggleEdit={() => setEditing((prev) => ({ ...prev, received: !prev.received }))}
            onSetStatus={setStatus}
          />
        </div>
        <PhotoColumn
          status="full"
          people={byStatus.full}
          students={students}
          editing={Boolean(editing.full)}
          onToggleEdit={() => setEditing((prev) => ({ ...prev, full: !prev.full }))}
          onSetStatus={setStatus}
        />
      </div>
    </div>
  )
}

function PhotoColumn({
  status,
  people,
  students,
  editing,
  onToggleEdit,
  onSetStatus,
}: {
  status: (typeof PHOTO_COLUMNS)[number]
  people: Student[]
  students: Student[]
  editing: boolean
  onToggleEdit: () => void
  onSetStatus: (id: string, status: PhotoshootStatus) => void
}) {
  const [query, setQuery] = useState("")
  const hits = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    const inColumn = new Set(people.map((s) => s.id))
    return students
      .filter((s) => !inColumn.has(s.id) && matchesQuery(s, q))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .slice(0, 8)
  }, [query, students, people])

  return (
    <Panel className="h-fit min-w-0 overflow-hidden p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <h2 className="min-w-0 truncate font-heading text-xl">{PHOTO_LABELS[status]}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{people.length}</span>
          <Button size="xs" variant={editing ? "default" : "outline"} onClick={onToggleEdit}>
            <Pencil className="size-3" />
            {editing ? "Done" : "Edit"}
          </Button>
        </div>
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{editing ? "Nobody here yet." : "None"}</p>
      ) : (
        <ul className="grid min-w-0 gap-2">
          {people.map((student) => (
            <li key={student.id} className="flex min-w-0 items-center gap-2">
              <Link
                href={`/students/${student.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-lg p-1 hover:bg-muted/50"
              >
                <StudentPhoto student={student} size="sm" />
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate text-sm font-medium">{fullName(student)}</span>
                  {student.photoshootNotes ? (
                    <span className="block truncate text-xs text-muted-foreground">{student.photoshootNotes}</span>
                  ) : null}
                </span>
              </Link>
              {editing ? (
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={`Remove from ${PHOTO_LABELS[status]}`}
                  onClick={() => onSetStatus(student.id, "none")}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <div className="mt-3 min-w-0 border-t border-border pt-3">
          <Input
            placeholder="Type a name to add"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {hits.length > 0 ? (
            <ul className="mt-2 min-w-0 overflow-hidden rounded-xl border border-border">
              {hits.map((s) => (
                <li key={s.id} className="min-w-0 border-b border-border last:border-0">
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onSetStatus(s.id, status)
                      setQuery("")
                    }}
                  >
                    <span className="min-w-0 truncate">{fullName(s)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">No match.</p>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}
