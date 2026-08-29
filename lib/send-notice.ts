"use client"

import { toast } from "sonner"
import { fillTemplate, fullName, smsHref } from "@/lib/format"
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

  const payloadStudents = students.map((student) => {
    const text = body.includes("{{") ? fillTemplate(body, student) : body || overdueStudentBody(student)
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      email: student.email,
      body: text,
    }
  })

  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel,
      subject,
      count: students.length,
      message: body,
      students: payloadStudents,
    }),
  })
  const info = (await res.json()) as { mode: string; message: string }

  addNotification({
    studentIds: students.map((s) => s.id),
    channel,
    subject,
    body,
    status: info.mode === "live" ? "sent" : "demo",
  })

  if (info.mode !== "live") {
    if (students.length === 1) {
      const student = students[0]
      const text = payloadStudents[0]?.body || ""
      const sub = fillTemplate(subject, student)
      if (channel === "sms" && student.phone) window.open(smsHref(student.phone, text), "_blank")
      if (channel === "email" && student.email) {
        window.open(
          `mailto:${student.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(text)}`,
        )
      }
    } else if (channel === "email") {
      const emails = students.map((s) => s.email).filter(Boolean)
      if (emails.length) {
        window.open(
          `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        )
      }
    } else if (channel === "sms") {
      const withPhone = students.filter((s) => s.phone)
      try {
        await navigator.clipboard.writeText(body)
      } catch {
        /* clipboard blocked */
      }
      if (withPhone[0]) window.open(smsHref(withPhone[0].phone, body), "_blank")
      toast.message(
        `Copied the reminder. Opened a text for ${withPhone[0] ? fullName(withPhone[0]) : "the first student"} · ${students.length} overdue.`,
      )
    }
  }

  toast.success(info.message)
}
