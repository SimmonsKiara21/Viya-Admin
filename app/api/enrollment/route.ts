import { NextResponse } from "next/server"
import seed from "@/data/seed.json"
import type { Student } from "@/lib/types"
import { applyWorkbookRows, parseEnrollmentCsv } from "@/lib/enrollment-sync"
import { readBundledEnrollmentRows, readEnrollmentLive, writeEnrollmentLive } from "@/lib/enrollment-live"
import { parseEnrollmentFile } from "@/lib/enrollment-file"

export const runtime = "nodejs"

function seedStudents() {
  return ((seed.students as Student[]) ?? []).map((s) => ({ ...s }))
}

export async function GET() {
  const workbook = seedStudents()
  const bundled = await readBundledEnrollmentRows()
  const fromDoc = bundled.length ? applyWorkbookRows(workbook, bundled) : { students: workbook, added: 0, updated: 0 }
  const live = await readEnrollmentLive()
  const csvUrl = process.env.ENROLLMENT_CSV_URL || ""
  let students = fromDoc.students
  let source: "csv" | "upload" | "webhook" | "workbook" = bundled.length ? "csv" : "workbook"
  let message = bundled.length
    ? `Current Students enrollment doc loaded · ${fromDoc.updated} updated · ${fromDoc.added} new. Upload a newer export anytime the sheet changes.`
    : "Using the 2026 enrollment workbook snapshot. Upload the latest export, or publish the Google Sheet as CSV and set ENROLLMENT_CSV_URL so edits land on the desk."
  let error = ""
  let added = fromDoc.added
  let updated = fromDoc.updated

  if (live?.students?.length && live.source !== "csv") {
    students = live.students.map((s) => ({ ...s }))
    source = live.source
    message = `Enrollment doc last synced ${live.updatedAt.slice(0, 16).replace("T", " ")} (${live.source}).`
  }

  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { cache: "no-store" })
      if (!res.ok) throw new Error(`Enrollment sheet ${res.status}`)
      const merged = applyWorkbookRows(students, parseEnrollmentCsv(await res.text()))
      students = merged.students
      added = merged.added
      updated = merged.updated
      source = "csv"
      message = `Live enrollment sheet · ${merged.students.length} people${added ? ` · ${added} new` : ""}${updated ? ` · ${updated} updated` : ""}.`
      if (merged.added || merged.updated) await writeEnrollmentLive(students, "csv")
    } catch (err) {
      error = err instanceof Error ? err.message : "Enrollment sheet error"
      message = `Enrollment sheet failed (${error}). ${live?.students?.length ? "Showing the last synced enrollment doc." : "Using the workbook snapshot."}`
    }
  }

  return NextResponse.json({
    source,
    connected: source !== "workbook",
    message,
    error: error || undefined,
    fetchedAt: new Date().toISOString(),
    updatedAt: live?.updatedAt,
    webhookPath: "/api/enrollment/webhook",
    students,
  })
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let rows: Partial<Student>[] = []
    let filename = "enrollment.csv"

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Attach the enrollment CSV or Excel file." }, { status: 400 })
      }
      filename = file.name || filename
      const bytes = Buffer.from(await file.arrayBuffer())
      rows = await parseEnrollmentFile(filename, bytes)
    } else if (contentType.includes("application/json")) {
      const body = (await request.json()) as { students?: Partial<Student>[]; csv?: string }
      if (Array.isArray(body.students)) rows = body.students
      else if (body.csv) rows = parseEnrollmentCsv(body.csv)
    } else {
      rows = parseEnrollmentCsv(await request.text())
    }

    if (!rows.length) {
      return NextResponse.json({ error: "No students found in that enrollment file." }, { status: 400 })
    }

    const merged = applyWorkbookRows(seedStudents(), rows)
    const saved = await writeEnrollmentLive(merged.students, "upload")
    return NextResponse.json({
      source: "upload",
      connected: true,
      message: `Enrollment doc synced · ${merged.students.length} people · ${merged.added} new · ${merged.updated} updated.`,
      fetchedAt: saved.updatedAt,
      updatedAt: saved.updatedAt,
      added: merged.added,
      updated: merged.updated,
      students: merged.students,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read that enrollment file." },
      { status: 400 },
    )
  }
}
