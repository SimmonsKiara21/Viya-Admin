import { toE164 } from "./format"

export type TextlaRecipient = {
  phone: string
  firstName: string
  lastName: string
  body: string
}

export type TextlaSendResult = {
  sent: number
  failed: number
  skipped: number
  mode: "live" | "demo"
  message: string
  errors: string[]
}

export function textlaStatus() {
  const webhook = process.env.TEXTLA_WEBHOOK_URL || ""
  const apiUrl = process.env.TEXTLA_API_URL || ""
  const apiKey = process.env.TEXTLA_API_KEY || ""
  const from = process.env.TEXTLA_FROM_NUMBER || ""
  const connected = Boolean(webhook || (apiKey && apiUrl))
  return {
    connected,
    from,
    via: webhook ? ("webhook" as const) : apiUrl ? ("api" as const) : ("none" as const),
    message: connected
      ? `Texts send from the academy Textla number${from ? ` (${from})` : ""}.`
      : "Add TEXTLA_WEBHOOK_URL (Zapier → Textla Send Message) so desk texts go out from Textla. TEXTLA_FROM_NUMBER is the academy Textla line.",
  }
}

export async function sendTextlaMessages(recipients: TextlaRecipient[]): Promise<TextlaSendResult> {
  const ready = textlaStatus()
  const usable = recipients.filter((row) => toE164(row.phone) && row.body.trim())
  const skipped = recipients.length - usable.length
  if (!ready.connected) {
    return {
      sent: 0,
      failed: 0,
      skipped,
      mode: "demo",
      message: ready.message,
      errors: [],
    }
  }

  const errors: string[] = []
  let sent = 0
  let failed = 0
  for (const row of usable) {
    try {
      await deliverOne(row, ready.from)
      sent += 1
    } catch (err) {
      failed += 1
      errors.push(
        `${row.firstName} ${row.lastName}: ${err instanceof Error ? err.message : "Textla send failed"}`,
      )
    }
  }

  return {
    sent,
    failed,
    skipped,
    mode: sent > 0 ? "live" : failed > 0 ? "demo" : "live",
    message:
      failed && sent
        ? `Textla sent ${sent} · ${failed} failed.`
        : failed
          ? `Textla could not send (${errors[0] || "check the Textla webhook"}).`
          : `Sent ${sent} text${sent === 1 ? "" : "s"} from Textla${ready.from ? ` (${ready.from})` : ""}.`,
    errors,
  }
}

async function deliverOne(row: TextlaRecipient, from: string) {
  const to = toE164(row.phone)
  const webhook = process.env.TEXTLA_WEBHOOK_URL || ""
  const apiUrl = process.env.TEXTLA_API_URL || ""
  const apiKey = process.env.TEXTLA_API_KEY || ""
  const payload = {
    phone: to,
    to,
    to_phone: to,
    firstName: row.firstName,
    lastName: row.lastName,
    message: row.body,
    body: row.body,
    from,
    from_phone: from,
  }

  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Textla webhook ${res.status}`)
    return
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Textla API ${res.status}`)
}
