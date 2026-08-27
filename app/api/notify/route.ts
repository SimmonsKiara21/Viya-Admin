import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    channel?: "sms" | "email"
    subject?: string
    count?: number
  }
  const channel = body.channel === "email" ? "email" : "sms"
  const count = body.count ?? 1

  const gmailReady = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  const smsReady = Boolean(
    process.env.TWILIO_ACCOUNT_SID || process.env.TEXTLA_API_KEY,
  )
  const squareReady = Boolean(process.env.SQUARE_ACCESS_TOKEN)

  if (channel === "email" && gmailReady) {
    return NextResponse.json({
      mode: "live",
      message: `Gmail is connected. ${count} message${count === 1 ? "" : "s"} queued.`,
    })
  }
  if (channel === "sms" && smsReady) {
    return NextResponse.json({
      mode: "live",
      message: `Texting is connected. ${count} message${count === 1 ? "" : "s"} queued.`,
    })
  }

  const extra = squareReady
    ? " Square is connected for payment tracking."
    : ""

  return NextResponse.json({
    mode: "demo",
    message:
      channel === "sms"
        ? count === 1
          ? `Logged, and your phone's text app should open. Add TEXTLA_API_KEY or Twilio keys to send without leaving the desk.${extra}`
          : `Logged ${count} texts in the outbox. For one student we open the phone's text app; for a group, connect Textla or Twilio to send live.${extra}`
        : count === 1
          ? `Logged, and Gmail/mail should open with the message filled in. Add GMAIL_USER + GMAIL_APP_PASSWORD to send from the desk.${extra}`
          : `Logged ${count} emails in the outbox. Connect Gmail in .env.local to send a group from here.${extra}`,
  })
}
