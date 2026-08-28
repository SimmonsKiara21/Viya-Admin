import { NextResponse } from "next/server"
import snapshot from "@/data/square.json"
import { fetchLiveSquareInvoices } from "@/lib/square-live"
import type { SquareInvoiceRow } from "@/lib/square-sync"

export const runtime = "nodejs"

export async function GET() {
  const token = process.env.SQUARE_ACCESS_TOKEN || ""
  const live = await fetchLiveSquareInvoices()
  const dashboard = (snapshot.invoices ?? []) as SquareInvoiceRow[]
  const invoices = live.invoices.length ? live.invoices : dashboard
  const source = live.invoices.length ? "api" : "dashboard"
  const skipped = snapshot.skipped ?? []

  let message = `Using Square dashboard invoices (${snapshot.syncedAt}). Add SQUARE_ACCESS_TOKEN to pull live invoices and due dates for enrollment students.`
  if (token && live.error) {
    message = `Square API failed (${live.error}). Showing the last dashboard invoice snapshot.`
  } else if (token && live.invoices.length) {
    message = `Live Square invoices · ${live.invoices.length} pulled. Matched to the enrollment roster only — Square customers who are not on that list stay off the desk.`
  } else if (token) {
    message = "Square is connected but returned no invoices yet. Enrollment students still show the last dashboard snapshot."
  }

  return NextResponse.json({
    connected: Boolean(token) && !live.error,
    source,
    environment: process.env.SQUARE_ENVIRONMENT || "production",
    locationId: process.env.SQUARE_LOCATION_ID || snapshot.locationNote || null,
    syncedAt: new Date().toISOString(),
    snapshotAt: snapshot.syncedAt,
    itemCount: snapshot.items.length,
    invoiceCount: invoices.length,
    skippedCount: skipped.length,
    skipped,
    invoices,
    message,
    error: live.error,
  })
}
