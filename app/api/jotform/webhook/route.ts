import { NextResponse } from "next/server"
import { parseJotformList, parseJotformPayload } from "@/lib/jotform"
import { rememberCheckIns } from "@/lib/jotform-live"

export const runtime = "nodejs"

async function bodyAsObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => null)
    return json && typeof json === "object" ? (json as Record<string, unknown>) : {}
  }
  const form = await request.formData().catch(() => null)
  if (!form) return {}
  const out: Record<string, unknown> = {}
  form.forEach((value, key) => {
    out[key] = typeof value === "string" ? value : value.name
  })
  return out
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Viya Academy Jotform webhook is ready. Point the attendance form webhook here.",
  })
}

export async function POST(request: Request) {
  const payload = await bodyAsObject(request)
  const rows = parseJotformList(payload)
  const single = rows.length ? rows : (() => {
    const one = parseJotformPayload(payload)
    return one ? [one] : []
  })()
  if (!single.length) {
    return NextResponse.json({ ok: false, message: "No check-in fields found." }, { status: 400 })
  }
  await rememberCheckIns(single)
  return NextResponse.json({ ok: true, count: single.length, ids: single.map((row) => row.id) })
}
