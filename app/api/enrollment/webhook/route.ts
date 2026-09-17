import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json(
    {
      frozen: true,
      source: "workbook",
      message: "Enrollment is native on the desk. Sheet webhooks are ignored so unlinking the Google Doc cannot wipe the roster.",
    },
    { status: 410 },
  )
}
