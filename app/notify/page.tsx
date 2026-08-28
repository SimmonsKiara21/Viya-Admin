"use client"

import { useMemo, useState } from "react"
import { NotifyComposer } from "@/components/notify-composer"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { formatDateTime, fullName } from "@/lib/format"
import { SYSTEM_GROUP_DEFS } from "@/lib/groups"
import { cn } from "@/lib/utils"

export default function NotifyPage() {
  const { notifications, students, groups } = useStore()
  const [activeGroup, setActiveGroup] = useState<string>("")

  const presetStudents = useMemo(() => {
    if (!activeGroup) return []
    const group = groups.find((g) => g.id === activeGroup)
    if (!group) return []
    return students.filter((s) => group.studentIds.includes(s.id))
  }, [activeGroup, groups, students])

  const templateForGroup = useMemo(() => {
    const group = groups.find((g) => g.id === activeGroup)
    if (group?.systemKey === "overdue") return "overdue-sms"
    if (group?.systemKey === "subscriberOverdue") return "overdue-sms"
    if (group?.systemKey === "current") return "weekly-academy"
    if (group?.systemKey === "subscribers") return "weekly-subscriber"
    return undefined
  }, [activeGroup, groups])

  const systemGroups = groups.filter((g) => g.kind === "system")
  const customGroups = groups.filter((g) => g.kind === "custom")

  return (
    <div>
      <PageHeader
        eyebrow="Outreach"
        title="Text & Gmail"
        description="Current students, academy overdue, subscriber overdue, and subscribers each have their own notification group. Add several people and save them as a custom group for a group message."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {systemGroups.map((g) => {
          const def = SYSTEM_GROUP_DEFS.find((d) => d.systemKey === g.systemKey)
          const on = activeGroup === g.id
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroup(on ? "" : g.id)}
              className={cn(
                "rounded-2xl border p-4 text-left",
                on
                  ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.12)]"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <p className="font-heading text-2xl">{g.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{g.studentIds.length} people</p>
              <p className="mt-2 text-xs text-muted-foreground">{def?.description}</p>
            </button>
          )
        })}
      </div>

      {customGroups.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {customGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroup(g.id === activeGroup ? "" : g.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                activeGroup === g.id
                  ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                  : "border-border text-muted-foreground",
              )}
            >
              {g.name} · {g.studentIds.length}
            </button>
          ))}
        </div>
      ) : null}

      <Panel className="mb-8">
        <NotifyComposer
          key={activeGroup || "pick"}
          presetStudents={presetStudents}
          initialGroupId={activeGroup || undefined}
          initialTemplateId={templateForGroup}
        />
      </Panel>

      <h2 className="mb-3 font-heading text-3xl">Outbox</h2>
      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing sent yet"
          description="Reminders you send are stored here so you can see who already got a Square or Textla nudge."
        />
      ) : (
        <ul className="grid gap-3">
          {notifications.map((n) => (
            <li key={n.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {n.channel === "sms" ? "Text" : "Email"} · {n.status} · {formatDateTime(n.sentAt)}
                </span>
                <span>
                  {n.studentIds.length} recipient{n.studentIds.length === 1 ? "" : "s"}
                </span>
              </div>
              {n.subject ? <p className="mt-2 font-medium">{n.subject}</p> : null}
              <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{n.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {n.studentIds
                  .map((id) => {
                    const s = students.find((x) => x.id === id)
                    return s ? fullName(s) : id
                  })
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
