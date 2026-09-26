import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { DESK_BUILD, DESK_PASSWORD } from "@/lib/constants"
import {
  decodeStoredSnapshot,
  encodeStoredSnapshot,
  parseDeskRequest,
  pickNewer,
  readGithubSnapshot,
  readLiveDrop,
  writeGithubSnapshot,
  writeLiveDrop,
} from "@/lib/desk-github"
import { DESK_SNAPSHOT_FILE, emptyDeskSnapshot, type DeskSnapshot } from "@/lib/desk-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const localFile = path.join(process.cwd(), DESK_SNAPSHOT_FILE)

const noStore = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
}

async function readLocalSnapshot(): Promise<DeskSnapshot> {
  try {
    const raw = JSON.parse(await readFile(localFile, "utf8")) as unknown
    return decodeStoredSnapshot(raw) || emptyDeskSnapshot(DESK_BUILD)
  } catch {
    return emptyDeskSnapshot(DESK_BUILD)
  }
}

export async function GET() {
  const local = await readLocalSnapshot()
  const remote = await readGithubSnapshot()
  const live = await readLiveDrop()
  const snapshot = pickNewer(pickNewer(local, remote), live)
  return NextResponse.json(
    {
      source: snapshot.source,
      savedAt: snapshot.savedAt,
      build: snapshot.build,
      data: snapshot.data,
      shared: snapshot.source === "staff",
      github: Boolean(remote?.data),
      live: Boolean(live?.data),
    },
    { headers: noStore },
  )
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as (DeskSnapshot & { password?: string }) | null
  if (!body || body.password !== DESK_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Desk password required." }, { status: 401, headers: noStore })
  }
  const snapshot = await parseDeskRequest(body, DESK_BUILD)
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "That save did not include a desk roster." }, { status: 400, headers: noStore })
  }
  try {
    await writeFile(localFile, JSON.stringify(encodeStoredSnapshot(snapshot)))
  } catch {
    /* Vercel filesystem is read-only — GitHub is the real store */
  }
  const github = await writeGithubSnapshot(snapshot)
  const live = await writeLiveDrop(snapshot)
  if (!github.ok && !live.ok) {
    return NextResponse.json(
      { ok: false, error: github.error || live.error, savedAt: snapshot.savedAt },
      { status: 503, headers: noStore },
    )
  }
  return NextResponse.json(
    { ok: true, savedAt: snapshot.savedAt, shared: true, github: github.ok, live: live.ok },
    { headers: noStore },
  )
}
