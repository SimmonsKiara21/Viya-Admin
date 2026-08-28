import { NextResponse } from "next/server"
import { JOTFORM_ATTENDANCE_ID, JOTFORM_ATTENDANCE_URL } from "@/lib/constants"
import { parseJotformList, type JotformCheckIn } from "@/lib/jotform"
import { readLiveCheckIns, rememberCheckIns } from "@/lib/jotform-live"

export const runtime = "nodejs"

function unique(rows: JotformCheckIn[]) {
  const seen = new Set<string>()
  const out: JotformCheckIn[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))
}

async function fetchFromJotform(apiKey: string): Promise<JotformCheckIn[]> {
  const url = new URL(`https://api.jotform.com/form/${JOTFORM_ATTENDANCE_ID}/submissions`)
  url.searchParams.set("apiKey", apiKey)
  url.searchParams.set("limit", "1000")
  url.searchParams.set("orderby", "created_at")
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Jotform API ${res.status}`)
  }
  const json = (await res.json()) as unknown
  return parseJotformList(json)
}

export async function GET() {
  const apiKey = process.env.JOTFORM_API_KEY || ""
  const live = await readLiveCheckIns()
  let source: "api" | "webhook" | "waiting" = live.length ? "webhook" : "waiting"
  let message =
    "Waiting on the student form. Desk check-ins are posted to Jotform. Student-phone check-ins appear here when a Jotform API key or webhook is connected."
  let apiRows: JotformCheckIn[] = []
  let error = ""

  if (apiKey) {
    try {
      apiRows = await fetchFromJotform(apiKey)
      source = "api"
      message = `Live Jotform tracker · ${apiRows.length} submission${apiRows.length === 1 ? "" : "s"} pulled.`
      if (apiRows.length) await rememberCheckIns(apiRows)
    } catch (err) {
      error = err instanceof Error ? err.message : "Jotform API error"
      message = live.length
        ? `Jotform API failed (${error}). Showing check-ins already received by webhook.`
        : `Jotform API failed (${error}). Desk check-ins still post to the form.`
    }
  } else if (live.length) {
    source = "webhook"
    message = `Jotform webhook is receiving check-ins · ${live.length} on file.`
  }

  return NextResponse.json({
    formId: JOTFORM_ATTENDANCE_ID,
    formUrl: JOTFORM_ATTENDANCE_URL,
    connected: Boolean(apiKey),
    source,
    message,
    error: error || undefined,
    fetchedAt: new Date().toISOString(),
    checkIns: unique([...apiRows, ...live]),
  })
}
