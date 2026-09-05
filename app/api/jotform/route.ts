import { NextResponse } from "next/server"
import { JOTFORM_ATTENDANCE_ID, JOTFORM_ATTENDANCE_URL } from "@/lib/constants"
import { pullAttendanceSheet } from "@/lib/attendance-sheet"
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
  let source: "sheet" | "api" | "webhook" | "waiting" = live.length ? "webhook" : "waiting"
  let message =
    "Waiting on the published attendance tracker. Desk check-ins still post to Jotform."
  let sheetRows: JotformCheckIn[] = []
  let apiRows: JotformCheckIn[] = []
  let error = ""

  try {
    sheetRows = await pullAttendanceSheet()
    if (sheetRows.length) {
      source = "sheet"
      message = `Live attendance tracker · ${sheetRows.length} check-in${sheetRows.length === 1 ? "" : "s"} from the published sheet.`
      await rememberCheckIns(sheetRows)
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Attendance sheet error"
  }

  if (apiKey) {
    try {
      apiRows = await fetchFromJotform(apiKey)
      if (!sheetRows.length) {
        source = "api"
        message = `Live Jotform tracker · ${apiRows.length} submission${apiRows.length === 1 ? "" : "s"} pulled.`
      }
      if (apiRows.length) await rememberCheckIns(apiRows)
    } catch (err) {
      const apiError = err instanceof Error ? err.message : "Jotform API error"
      error = error ? `${error}; ${apiError}` : apiError
    }
  }

  if (!sheetRows.length && !apiRows.length) {
    if (live.length) {
      source = "webhook"
      message = error
        ? `Published tracker failed (${error}). Showing check-ins already received.`
        : `Jotform webhook is receiving check-ins · ${live.length} on file.`
    } else if (error) {
      message = `Attendance tracker failed (${error}). Desk check-ins still post to the form.`
    }
  }

  const checkIns =
    source === "sheet" ? unique(sheetRows) : unique([...sheetRows, ...apiRows, ...live])

  return NextResponse.json({
    formId: JOTFORM_ATTENDANCE_ID,
    formUrl: JOTFORM_ATTENDANCE_URL,
    connected: source === "sheet" || Boolean(apiKey),
    source,
    message,
    error: error || undefined,
    fetchedAt: new Date().toISOString(),
    checkIns,
  })
}
