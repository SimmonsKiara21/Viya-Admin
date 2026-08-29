import { NextResponse } from "next/server"
import { sendTextlaMessages, textlaStatus } from "@/lib/textla"

type NotifyStudent = {
  id?: string
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  body?: string
}

export async function GET() {
  const gmailReady = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  const textla = textlaStatus()
  return NextResponse.json({
    gmail: { connected: gmailReady },
    textla,
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    channel?: "sms" | "email"
    subject?: string
    count?: number
    students?: NotifyStudent[]
    message?: string
  }
  const channel = body.channel === "email" ? "email" : "sms"
  const people = body.students ?? []
  const count = people.length || body.count || 1
  const gmailReady = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)

  if (channel === "sms") {
    const recipients = people
      .filter((s) => s.phone)
      .map((s) => ({
        phone: s.phone || "",
        firstName: s.firstName || "",
        lastName: s.lastName || "",
        body: (s.body || body.message || "").trim(),
      }))
      .filter((s) => s.body)
    const result = await sendTextlaMessages(recipients)
    if (result.mode === "live" && result.sent > 0) {
      return NextResponse.json({
        mode: "live",
        message: result.message,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      })
    }
    const extra = result.errors[0] ? ` ${result.errors[0]}` : ""
    return NextResponse.json({
      mode: "demo",
      message:
        count === 1
          ? `Logged. Add TEXTLA_WEBHOOK_URL (Zapier → Textla Send Message) and TEXTLA_FROM_NUMBER to send from the academy Textla line.${extra}`
          : `Logged ${count} texts. Connect Textla so a group send goes out from the academy number without opening the phone app.${extra}`,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    })
  }

  if (gmailReady) {
    return NextResponse.json({
      mode: "live",
      message: `Gmail is connected. ${count} message${count === 1 ? "" : "s"} queued.`,
    })
  }

  return NextResponse.json({
    mode: "demo",
    message:
      count === 1
        ? "Logged, and Gmail/mail should open with the message filled in. Add GMAIL_USER + GMAIL_APP_PASSWORD to send from the desk."
        : `Logged ${count} emails in the outbox. Connect Gmail in .env.local to send a group from here.`,
  })
}
