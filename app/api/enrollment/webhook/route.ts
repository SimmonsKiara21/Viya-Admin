import { NextResponse } from "next/server"
import seed from "@/data/seed.json"
import type { Student } from "@/lib/types"
import { applyWorkbookRows, parseEnrollmentCsv } from "@/lib/enrollment-sync"
import { writeEnrollmentLive } from "@/lib/enrollment-live"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secret = process.env.ENROLLMENT_WEBHOOK_SECRET || ""
  const header = request.headers.get("x-enrollment-secret") || ""
  if (secret && header !== secret) {
    return NextResponse.json({ error: "Unauthorized enrollment webhook." }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""
  let rows: Partial<Student>[] = []
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { students?: Partial<Student>[]; csv?: string }
    if (Array.isArray(body.students)) rows = body.students
    else if (body.csv) rows = parseEnrollmentCsv(body.csv)
  } else {
    rows = parseEnrollmentCsv(await request.text())
  }

  if (!rows.length) {
    return NextResponse.json({ error: "No enrollment rows in the webhook body." }, { status: 400 })
  }

  const workbook = ((seed.students as Student[]) ?? []).map((s) => ({ ...s }))
  const merged = applyWorkbookRows(workbook, rows)
  const saved = await writeEnrollmentLive(merged.students, "webhook")
  return NextResponse.json({
    source: "webhook",
    connected: true,
    message: `Enrollment webhook synced · ${merged.students.length} people · ${merged.added} new · ${merged.updated} updated.`,
    fetchedAt: saved.updatedAt,
    added: merged.added,
    updated: merged.updated,
    students: merged.students,
  })
}
