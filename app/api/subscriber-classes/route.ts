import { NextResponse } from "next/server"
import stored from "@/data/subscriber-classes.json"

function parseSessions(html: string) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const sessions: Array<{ title: string; day: string; display: string }> = []
  const notes: string[] = []
  const day = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
  const time = /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm))/i

  for (const line of text) {
    if (line.length < 8 || line.length > 180) continue
    if (day.test(line) && time.test(line)) {
      sessions.push({
        title: line.slice(0, 120),
        day: (line.match(day) || [""])[0],
        display: line,
      })
    } else if (/class|workshop|subscriber|zoom|camelback/i.test(line) && line.length < 140) {
      notes.push(line)
    }
  }

  const unique = sessions.filter(
    (session, index, all) => all.findIndex((item) => item.display === session.display) === index,
  )
  return { sessions: unique.slice(0, 12), notes: notes.slice(0, 8) }
}

export async function GET() {
  try {
    const locked = await fetch("https://www.viyatalent.com/talentresources", {
      headers: { "user-agent": "ViyaAcademyDesk/1.0" },
      cache: "no-store",
    })
    const html = await locked.text()
    if (locked.status === 200 && !/password-form|lock-screen/i.test(html)) {
      const parsed = parseSessions(html)
      return NextResponse.json({
        source: "https://www.viyatalent.com/talentresources",
        updatedAt: new Date().toISOString(),
        unlocked: true,
        headline: "Subscriber classes — Talent Resources",
        sessions: parsed.sessions,
        notes: parsed.notes,
      })
    }

    return NextResponse.json({
      ...stored,
      unlocked: false,
      error: `Talent Resources returned ${locked.status}.`,
    })
  } catch {
    return NextResponse.json({
      ...stored,
      error: "Could not reach viyatalent.com from this desk.",
    })
  }
}

export const dynamic = "force-dynamic"
