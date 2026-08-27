"use client"

import { toast } from "sonner"
import { fillTemplate, smsHref } from "@/lib/format"
import { MESSAGE_TEMPLATES } from "@/lib/constants"
import { overdueStudentBody } from "@/lib/alerts"
import type { NotificationRecord, NotifyChannel, Student } from "@/lib/types"

export async function sendDeskNotice(opts: {
  students: Student[]
  channel: NotifyChannel
  templateId?: string
  subject?: string
  body?: string
  addNotification: (note: Omit<NotificationRecord, "id" | "sentAt"> & { sentAt?: string }) => void
}) {
  const { students, channel, addNotification } = opts
  if (!students.length) {
    toast.error("No students to notify.")
    return
  }
  const template = MESSAGE_TEMPLATES.find((t) => t.id === opts.templateId)
  const subject = opts.subject ?? template?.subject ?? ""
  const body = opts.body ?? template?.body ?? ""

  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, subject, count: students.length }),
  })
  const info = (await res.json()) as { mode: string; message: string }

  addNotification({
    studentIds: students.map((s) => s.id),
    channel,
    subject,
    body,
    status: info.mode === "live" ? "sent" : "demo",
  })

  if (students.length === 1) {
    const student = students[0]
    const text = body.includes("{{") ? fillTemplate(body, student) : overdueStudentBody(student)
    const sub = fillTemplate(subject, student)
    if (channel === "sms" && student.phone) window.open(smsHref(student.phone, text), "_blank")
    if (channel === "email" && student.email) {
      window.open(
        `mailto:${student.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(text)}`,
      )
    }
  }

  toast.success(info.message)
}
