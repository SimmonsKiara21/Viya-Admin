"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, NativeSelect } from "@/components/ui-helpers"
import { MESSAGE_TEMPLATES } from "@/lib/constants"
import { fillTemplate, formatMoney, formatPhone, fullName, matchesQuery, smsHref } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { NotifyChannel, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

export function NotifyComposer({
  presetStudents = [],
  compact = false,
  initialTemplateId,
  initialBody,
}: {
  presetStudents?: Student[]
  compact?: boolean
  initialTemplateId?: string
  initialBody?: string
}) {
  const { students, addNotification } = useStore()
  const starter = MESSAGE_TEMPLATES.find((t) => t.id === initialTemplateId) ?? MESSAGE_TEMPLATES[0]
  const [channel, setChannel] = useState<NotifyChannel>(starter.channel)
  const [templateId, setTemplateId] = useState(starter.id)
  const [subject, setSubject] = useState(starter.subject)
  const [body, setBody] = useState(initialBody ?? starter.body)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>(presetStudents.map((s) => s.id))

  const picked = students.filter((s) => selected.includes(s.id))
  const searchHits = useMemo(
    () => (query.trim() ? students.filter((s) => matchesQuery(s, query)).slice(0, 6) : []),
    [query, students],
  )

  function applyTemplate(id: string) {
    const t = MESSAGE_TEMPLATES.find((x) => x.id === id)
    if (!t) return
    setTemplateId(id)
    setChannel(t.channel)
    setSubject(t.subject)
    setBody(t.body)
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
    }

    toast.success(info.message)
    if (presetStudents.length === 0) setSelected([])
  }

  return (
    <div className={cn("grid gap-4", compact ? "" : "lg:grid-cols-[1fr_280px]")}>
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
          Use {"{{firstName}}"}, {"{{amount}}"}, and {"{{due}}"} — they fill in per student.
        </p>
        <Button onClick={send} className="w-full sm:w-auto">
          Send {channel === "sms" ? "texts" : "emails"} to {picked.length || 0}
        </Button>
      </div>

      <div className="grid gap-3">
        <Field label="Recipients">
          <Input
            placeholder="Add by name or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        {searchHits.length > 0 ? (
          <ul className="overflow-hidden rounded-xl border border-border">
            {searchHits.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setSelected((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]))
                    setQuery("")
                  }}
                >
                  <span>{fullName(s)}</span>
                  <span className="text-xs text-muted-foreground">#{s.id}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {picked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one selected yet.</p>
        ) : (
          <ul className="grid gap-1.5">
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
                  onClick={() => setSelected((prev) => prev.filter((id) => id !== s.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
