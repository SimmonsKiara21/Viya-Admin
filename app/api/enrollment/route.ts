import { NextResponse } from "next/server"
import seed from "@/data/seed.json"
import type { Student } from "@/lib/types"
import { applyWorkbookRows, parseEnrollmentCsv } from "@/lib/enrollment-sync"
import { readBundledEnrollmentRows, writeEnrollmentLive } from "@/lib/enrollment-live"
import { parseEnrollmentFile } from "@/lib/enrollment-file"
import { pullPublishedEnrollment } from "@/lib/enrollment-sheet"
import { ENROLLMENT_SHEET_URL } from "@/lib/constants"

export const runtime = "nodejs"

function seedStudents() {
  return ((seed.students as Student[]) ?? []).map((s) => ({ ...s }))
}

export async function GET() {
  const workbook = seedStudents()
  const sheetUrl = process.env.ENROLLMENT_CSV_URL || ENROLLMENT_SHEET_URL
  let students = workbook
  let source: "csv" | "upload" | "webhook" | "workbook" = "workbook"
  let message =
    "Using the 2026 enrollment workbook snapshot. The published Google Sheet will refresh this roster when it is reachable."
  let error = ""
  let added = 0
  let updated = 0
  let tabs: { name: string; rows: number }[] = []

  try {
    const live = await pullPublishedEnrollment(workbook, sheetUrl)
    students = live.students
    added = live.added
    updated = live.updated
    tabs = live.tabs.map((tab) => ({ name: tab.name, rows: tab.rows }))
    source = "csv"
    const tabBits = live.tabs
      .filter((tab) => tab.rows)
      .map((tab) => `${tab.name} ${tab.rows}`)
      .join(" · ")
    message = `Live enrollment Google Sheet · ${updated} updated · ${added} new${tabBits ? ` · ${tabBits}` : ""}. Edits on the published doc show up here automatically.`
    if (added || updated) await writeEnrollmentLive(students, "csv")
  } catch (err) {
    error = err instanceof Error ? err.message : "Enrollment sheet error"
    const bundled = await readBundledEnrollmentRows()
    if (bundled.length) {
      const fallback = applyWorkbookRows(workbook, bundled)
      students = fallback.students
      added = fallback.added
      updated = fallback.updated
      source = "csv"
      message = `Published sheet failed (${error}). Showing the last saved Current Students export.`
    } else {
      message = `Enrollment sheet failed (${error}). Using the workbook snapshot.`
    }
  }

  return NextResponse.json({
    source,
    connected: source !== "workbook",
    message,
    error: error || undefined,
    fetchedAt: new Date().toISOString(),
    sheetUrl,
    tabs,
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
