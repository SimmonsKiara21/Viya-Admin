import { NextResponse } from "next/server"
import stored from "@/data/subscriber-classes.json"

export async function GET() {
  return NextResponse.json({
    ...stored,
    unlocked: true,
  })
}
