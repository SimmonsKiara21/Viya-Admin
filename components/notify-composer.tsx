"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, NativeSelect } from "@/components/ui-helpers"
import { MESSAGE_TEMPLATES } from "@/lib/constants"
import { fillTemplate, formatMoney, formatPhone, fullName, matchesQuery, smsHref } from "@/lib/format"
import { SYSTEM_GROUP_DEFS } from "@/lib/groups"
import { useStore } from "@/lib/store"
import type { NotifyChannel, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

export function NotifyComposer({
  presetStudents = [],
  compact = false,
  initialTemplateId,
  initialBody,
  initialGroupId,
}: {
  presetStudents?: Student[]
  compact?: boolean
  initialTemplateId?: string
  initialBody?: string
  initialGroupId?: string
}) {
  const { students, groups, addNotification, addGroup, deleteGroup } = useStore()
  const starter = MESSAGE_TEMPLATES.find((t) => t.id === initialTemplateId) ?? MESSAGE_TEMPLATES[0]
  const [channel, setChannel] = useState<NotifyChannel>(starter.channel)
  const [templateId, setTemplateId] = useState(starter.id)
  const [subject, setSubject] = useState(starter.subject)
  const [body, setBody] = useState(initialBody ?? starter.body)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>(presetStudents.map((s) => s.id))
  const [groupId, setGroupId] = useState(initialGroupId ?? "")
  const [newGroupName, setNewGroupName] = useState("")

  const picked = students.filter((s) => selected.includes(s.id))
  const pickerList = useMemo(() => {
    const pool = query.trim() ? students.filter((s) => matchesQuery(s, query)) : students
    return [...pool]
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .slice(0, 120)
  }, [query, students])

  function applyTemplate(id: string) {
    const t = MESSAGE_TEMPLATES.find((x) => x.id === id)
    if (!t) return
    setTemplateId(id)
    setChannel(t.channel)
    setSubject(t.subject)
    setBody(t.body)
  }

  function applyGroup(id: string) {
    setGroupId(id)
    if (!id) return
    const group = groups.find((g) => g.id === id)
    if (group) setSelected(group.studentIds)
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setGroupId("")
  }

  function addAllHits() {
    setSelected((prev) => [...new Set([...prev, ...pickerList.map((s) => s.id)])])
    setGroupId("")
  }

  function saveGroup() {
    if (picked.length < 2) {
      toast.error("Add at least two students to save a group.")
      return
    }
    if (!newGroupName.trim()) {
      toast.error("Name the group first.")
      return
    }
    const group = addGroup(newGroupName.trim(), picked.map((s) => s.id))
    setGroupId(group.id)
    setNewGroupName("")
    toast.success(`Saved “${group.name}” with ${group.studentIds.length} people.`)
  }

  async function send() {
    if (picked.length === 0) {
      toast.error("Pick at least one student.")
      return
    }
    if (!body.trim()) {
      toast.error("Write a message first.")
      return
    }

    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        subject,
        count: picked.length,
      }),
    })
    const info = (await res.json()) as { mode: string; message: string }

    addNotification({
      studentIds: picked.map((s) => s.id),
      channel,
      subject,
      body,
      status: info.mode === "live" ? "sent" : "demo",
    })

    if (picked.length === 1) {
      const student = picked[0]
      const text = fillTemplate(body, student)
      const sub = fillTemplate(subject, student)
      if (channel === "sms" && student.phone) {
        window.open(smsHref(student.phone, text), "_blank")
      } else if (channel === "email" && student.email) {
        window.open(
          `mailto:${student.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(text)}`,
        )
      }
    } else if (channel === "email") {
      const emails = picked.map((s) => s.email).filter(Boolean)
      if (emails.length) {
        window.open(
          `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replaceAll("{{firstName}}", "everyone"))}`,
        )
      }
    }

    toast.success(info.message)
    if (presetStudents.length === 0 && !initialGroupId) setSelected([])
  }

  const systemGroups = groups.filter((g) => g.kind === "system")
  const customGroups = groups.filter((g) => g.kind === "custom")

  return (
    <div className={cn("grid gap-4", compact ? "" : "lg:grid-cols-[1fr_320px]")}>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Channel">
            <NativeSelect
              value={channel}
              onChange={(e) => setChannel(e.target.value as NotifyChannel)}
            >
              <option value="sms">Text message</option>
              <option value="email">Gmail / email</option>
            </NativeSelect>
          </Field>
          <Field label="Template">
            <NativeSelect value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              {MESSAGE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {channel === "email" ? (
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Message">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="min-h-32"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Use {"{{firstName}}"}, {"{{amount}}"}, and {"{{due}}"} — they fill in per student. Group emails open
          Gmail with everyone on BCC.
        </p>
        <Button onClick={send} className="w-full sm:w-auto">
          Send {channel === "sms" ? "texts" : "emails"} to {picked.length || 0}
        </Button>
      </div>

      <div className="grid gap-3">
        <Field label="Notification group">
          <NativeSelect value={groupId} onChange={(e) => applyGroup(e.target.value)}>
            <option value="">Pick people, or a saved group</option>
            <optgroup label="Desk groups">
              {systemGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.studentIds.length})
                </option>
              ))}
            </optgroup>
            {customGroups.length ? (
              <optgroup label="Custom groups">
                {customGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.studentIds.length})
                  </option>
                ))}
              </optgroup>
            ) : null}
          </NativeSelect>
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {systemGroups.map((g) => {
            const def = SYSTEM_GROUP_DEFS.find((d) => d.systemKey === g.systemKey)
            return (
              <button
                key={g.id}
                type="button"
                title={def?.description}
                onClick={() => applyGroup(g.id === groupId ? "" : g.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  groupId === g.id
                    ? "border-primary/50 bg-primary/16 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {g.name} · {g.studentIds.length}
              </button>
            )
          })}
        </div>
        <Field label="Click students to add">
          <Input
            placeholder="Filter the list, then click as many as you need"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <p className="text-xs text-muted-foreground">
              {pickerList.length} shown · click several in a row
            </p>
            <button type="button" className="text-xs underline" onClick={addAllHits}>
              Add all shown
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {pickerList.map((s) => {
              const on = selected.includes(s.id)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => toggle(s.id)}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{fullName(s)}</span>
                    <span className="text-xs text-muted-foreground">#{s.id}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        {picked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No one selected yet. Use Current students, Overdue students, or Subscribers — or search and
            check several people for a group message.
          </p>
        ) : (
          <ul className="grid max-h-56 gap-1.5 overflow-y-auto">
            {picked.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
              >
                <span>
                  {fullName(s)}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {channel === "sms" ? formatPhone(s.phone) : s.email || "no email"}
                    {s.nextPaymentAmount ? ` · ${formatMoney(s.nextPaymentAmount)}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toggle(s.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked.length >= 2 ? (
          <div className="grid gap-2 rounded-xl border border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Save as a group for later
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Group name — Saturday acting, photoshoot day…"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={saveGroup}>
                Save group
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 rounded-xl border border-dashed border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Save as a group for later
            </p>
            <p className="text-xs text-muted-foreground">
              Add at least two students, name the group, then save it for a group message.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Group name — Saturday modeling, photoshoot day…"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={saveGroup}>
                Save group
              </Button>
            </div>
          </div>
        )}
        {customGroups.length > 0 ? (
          <ul className="grid gap-1.5">
            {customGroups.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" className="hover:text-foreground" onClick={() => applyGroup(g.id)}>
                  {g.name} · {g.studentIds.length}
                </button>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => {
                    deleteGroup(g.id)
                    if (groupId === g.id) {
                      setGroupId("")
                      setSelected([])
                    }
                    toast.message(`Removed ${g.name}.`)
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
