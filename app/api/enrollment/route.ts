import { NextResponse } from "next/server"
import seed from "@/data/seed.json"
import type { Student } from "@/lib/types"

export const runtime = "nodejs"

function seedStudents() {
  return ((seed.students as Student[]) ?? []).map((s) => ({ ...s }))
}

const NATIVE_MESSAGE =
  "Enrollment is native on this desk. The Google Sheet is no longer used — notes, due dates, and payment plans stay on the website."

export async function GET() {
  const students = seedStudents()
  return NextResponse.json({
    source: "workbook",
    frozen: true,
    connected: true,
    message: NATIVE_MESSAGE,
    fetchedAt: new Date().toISOString(),
    students,
  })
}

export async function POST() {
  return NextResponse.json(
    {
      frozen: true,
      source: "workbook",
      connected: true,
      message: NATIVE_MESSAGE,
      error: "The enrollment Google Sheet is no longer connected. Edit people on the desk instead.",
    },
    { status: 409 },
  )
}
