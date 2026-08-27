import { NextResponse } from "next/server"
import square from "@/data/square.json"

export async function GET() {
  const token = process.env.SQUARE_ACCESS_TOKEN
  const location = process.env.SQUARE_LOCATION_ID
  const env = process.env.SQUARE_ENVIRONMENT || "production"

  const matchedInvoices = (square.invoices ?? []).length
  const skipped = square.skipped ?? []

  const message = token
    ? "Square credentials are present. The tracker below is enrollment students matched to Square invoices from the dashboard. People on Square who are not in the enrollment workbook are left off the roster."
    : `Desk mode is using Square invoices pulled from the logged-in dashboard (${square.syncedAt}). Only people who are also on the 2026 enrollment workbook are listed. ${skipped.length} Square customers were skipped because they are not on enrollment.`

  return NextResponse.json({
    connected: Boolean(token),
    deskSync: true,
    environment: env,
    locationId: location || square.locationNote || null,
    syncedAt: square.syncedAt,
    source: square.source,
    itemCount: square.items.length,
    matchedInvoices,
    skippedCount: skipped.length,
    skipped,
    items: square.items,
    message,
  })
}
