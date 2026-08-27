import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.SQUARE_ACCESS_TOKEN
  const location = process.env.SQUARE_LOCATION_ID
  const env = process.env.SQUARE_ENVIRONMENT || "sandbox"

  if (!token) {
    return NextResponse.json({
      connected: false,
      environment: env,
      message:
        "Square is running in desk mode. Invoices below come from the 2026 enrollment workbook. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID to sync live invoices.",
    })
  }

  return NextResponse.json({
    connected: true,
    environment: env,
    locationId: location || null,
    message: "Square credentials are present. Live invoice sync can be enabled next.",
  })
}
