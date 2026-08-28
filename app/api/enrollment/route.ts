import { NextResponse } from "next/server"
import seed from "@/data/seed.json"
import type { Student } from "@/lib/types"
import { parseEnrollmentCsv, studentFromCsvRow } from "@/lib/enrollment-sync"

export const runtime = "nodejs"

export async function GET() {
  const workbook = (seed.students as Student[]) ?? []
  const csvUrl = process.env.ENROLLMENT_CSV_URL || ""
  let source: "csv" | "workbook" = "workbook"
  let students = workbook
  let message = "Using the 2026 enrollment workbook snapshot on the desk. Publish the Google Sheet as CSV and set ENROLLMENT_CSV_URL to pull live roster changes."
  let error = ""

  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { cache: "no-store" })
      if (!res.ok) throw new Error(`Enrollment sheet ${res.status}`)
      const rows = parseEnrollmentCsv(await res.text())
      const byId = new Map(workbook.map((s) => [s.id, s]))
      students = workbook.map((s) => ({ ...s }))
      let added = 0
      for (const row of rows) {
        const existing =
          (row.id && byId.get(row.id)) ||
          students.find(
            (s) =>
              s.firstName.trim().toLowerCase() === (row.firstName || "").trim().toLowerCase() &&
              s.lastName.trim().toLowerCase() === (row.lastName || "").trim().toLowerCase(),
          )
        if (existing) {
          if (row.email) existing.email = row.email
          if (row.phone) existing.phone = row.phone
          if (row.startDate) existing.startDate = row.startDate
          continue
        }
        const created = studentFromCsvRow(row)
        if (!created) continue
        students.unshift(created)
        byId.set(created.id, created)
        added += 1
      }
      source = "csv"
      message = `Live enrollment sheet · ${rows.length} rows merged onto the workbook roster${added ? ` · ${added} new` : ""}.`
    } catch (err) {
      error = err instanceof Error ? err.message : "Enrollment sheet error"
      message = `Enrollment sheet failed (${error}). Using the workbook snapshot.`
    }
  }

  return NextResponse.json({
    source,
    connected: source === "csv",
    message,
    error: error || undefined,
    fetchedAt: new Date().toISOString(),
    students,
  })
}
