import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { DESK_BUILD, DESK_PASSWORD } from "@/lib/constants"
import {
  DESK_SNAPSHOT_FILE,
  emptyDeskSnapshot,
  snapshotFromPayload,
  type DeskSnapshot,
} from "@/lib/desk-sync"

export const runtime = "nodejs"

const REPO = process.env.GITHUB_STORE_REPO || "SimmonsKiara21/Viya-Admin"
const BRANCH = process.env.GITHUB_STORE_BRANCH || "main"
const localFile = path.join(process.cwd(), DESK_SNAPSHOT_FILE)

function githubToken() {
  return process.env.GITHUB_STORE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ""
}

async function githubHeaders() {
  const token = githubToken()
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ViyaAdminDesk",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function readLocalSnapshot(): Promise<DeskSnapshot> {
  try {
    const raw = JSON.parse(await readFile(localFile, "utf8")) as DeskSnapshot
    if (raw && typeof raw === "object") return raw
  } catch {
    /* no local snapshot yet */
  }
  return emptyDeskSnapshot(DESK_BUILD)
}

async function readGithubSnapshot(): Promise<DeskSnapshot | null> {
  const url = `https://api.github.com/repos/${REPO}/contents/${DESK_SNAPSHOT_FILE}?ref=${BRANCH}`
  const res = await fetch(url, { headers: await githubHeaders(), cache: "no-store" })
  if (!res.ok) return null
  const payload = (await res.json()) as { content?: string; encoding?: string }
  if (!payload.content) return null
  try {
    const text = Buffer.from(payload.content.replace(/\n/g, ""), payload.encoding === "base64" ? "base64" : "utf8").toString("utf8")
    return JSON.parse(text) as DeskSnapshot
  } catch {
    return null
  }
}

async function writeGithubSnapshot(snapshot: DeskSnapshot) {
  const token = githubToken()
  if (!token) return { ok: false, error: "Missing GITHUB_STORE_TOKEN on the server" }
  const url = `https://api.github.com/repos/${REPO}/contents/${DESK_SNAPSHOT_FILE}`
  const current = await fetch(`${url}?ref=${BRANCH}`, { headers: await githubHeaders(), cache: "no-store" })
  const sha = current.ok ? ((await current.json()) as { sha?: string }).sha : undefined
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...(await githubHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Save shared desk ${snapshot.savedAt}`,
      content: Buffer.from(JSON.stringify(snapshot)).toString("base64"),
      branch: BRANCH,
      sha,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, error: `GitHub ${res.status}: ${body.slice(0, 180)}` }
  }
  return { ok: true }
}

function pickNewer(local: DeskSnapshot, remote: DeskSnapshot | null): DeskSnapshot {
  if (!remote) return local
  if (remote.source === "staff" && local.source !== "staff") return remote
  if (local.source === "staff" && remote.source !== "staff") return local
  if (remote.savedAt && remote.savedAt >= (local.savedAt || "")) return remote
  return local
}

export async function GET() {
  const local = await readLocalSnapshot()
  const remote = await readGithubSnapshot()
  const snapshot = pickNewer(local, remote)
  return NextResponse.json({
    ...snapshot,
    shared: snapshot.source === "staff",
    github: Boolean(remote),
  })
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as (DeskSnapshot & { password?: string }) | null
  if (!body || body.password !== DESK_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Desk password required." }, { status: 401 })
  }
  const snapshot = snapshotFromPayload(body, DESK_BUILD)
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "That save did not include a desk roster." }, { status: 400 })
  }
  try {
    await writeFile(localFile, JSON.stringify(snapshot))
  } catch {
    /* Vercel filesystem is read-only — GitHub is the real store */
  }
  const github = await writeGithubSnapshot(snapshot)
  if (!github.ok) {
    return NextResponse.json({ ok: false, error: github.error, savedAt: snapshot.savedAt }, { status: 503 })
  }
  return NextResponse.json({ ok: true, savedAt: snapshot.savedAt, shared: true })
}
