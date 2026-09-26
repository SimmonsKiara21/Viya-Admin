import { gunzipSync, gzipSync } from "node:zlib"
import { DESK_BUILD } from "@/lib/constants"
import {
  DESK_SNAPSHOT_FILE,
  emptyDeskSnapshot,
  snapshotFromPayload,
  type DeskSnapshot,
} from "@/lib/desk-sync"

export const DESK_REPO = process.env.GITHUB_STORE_REPO || "SimmonsKiara21/Viya-Admin"
export const DESK_BRANCH = process.env.GITHUB_STORE_BRANCH || "main"

export function githubToken() {
  return (
    process.env.GITHUB_STORE_TOKEN ||
    process.env.DESK_STORE_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    ""
  )
}

export function githubHeaders() {
  const token = githubToken()
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ViyaAdminDesk",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function encodeStoredSnapshot(snapshot: DeskSnapshot) {
  const packed = gzipSync(Buffer.from(JSON.stringify(snapshot)), { level: 9 }).toString("base64")
  return {
    source: snapshot.source,
    savedAt: snapshot.savedAt,
    build: snapshot.build,
    encoding: "gzip-base64" as const,
    data: null,
    blob: packed,
  }
}

export function decodeStoredSnapshot(raw: unknown, build = DESK_BUILD): DeskSnapshot | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as DeskSnapshot
  if (row.encoding === "gzip-base64" && row.blob) {
    try {
      const text = gunzipSync(Buffer.from(row.blob, "base64")).toString("utf8")
      return decodeStoredSnapshot(JSON.parse(text), build)
    } catch {
      return null
    }
  }
  if (row.source === "staff" && row.data && Array.isArray(row.data.students)) {
    return {
      source: "staff",
      savedAt: row.savedAt || "",
      build: row.build || build,
      data: row.data,
    }
  }
  if (row.source === "seed") return emptyDeskSnapshot(row.build || build)
  return snapshotFromPayload(row, build)
}

export async function parseDeskRequest(payload: unknown, build: string): Promise<DeskSnapshot | null> {
  if (!payload || typeof payload !== "object") return null
  const row = payload as DeskSnapshot & { password?: string }
  if (row.encoding === "gzip-base64" && row.blob) {
    try {
      const text = gunzipSync(Buffer.from(row.blob, "base64")).toString("utf8")
      const inner = JSON.parse(text) as DeskSnapshot & { password?: string }
      return snapshotFromPayload({ ...inner, password: row.password || inner.password }, build)
    } catch {
      return null
    }
  }
  return snapshotFromPayload(payload, build)
}

export async function readGithubSnapshot(): Promise<DeskSnapshot | null> {
  const fromContents = await readGithubContents()
  if (fromContents) return fromContents
  return readGithubRaw()
}

async function readGithubContents(): Promise<DeskSnapshot | null> {
  const url = `https://api.github.com/repos/${DESK_REPO}/contents/${DESK_SNAPSHOT_FILE}?ref=${DESK_BRANCH}`
  const res = await fetch(url, { headers: githubHeaders(), cache: "no-store" })
  if (!res.ok) return null
  const payload = (await res.json()) as { content?: string; encoding?: string; download_url?: string; size?: number }
  if (payload.content) {
    try {
      const text = Buffer.from(payload.content.replace(/\n/g, ""), payload.encoding === "base64" ? "base64" : "utf8").toString(
        "utf8",
      )
      return decodeStoredSnapshot(JSON.parse(text))
    } catch {
      /* try the raw file next */
    }
  }
  if (payload.download_url) {
    const raw = await fetch(payload.download_url, { headers: githubHeaders(), cache: "no-store" })
    if (!raw.ok) return null
    try {
      return decodeStoredSnapshot(await raw.json())
    } catch {
      return null
    }
  }
  return null
}

async function readGithubRaw(): Promise<DeskSnapshot | null> {
  const url = `https://raw.githubusercontent.com/${DESK_REPO}/${DESK_BRANCH}/${DESK_SNAPSHOT_FILE}?_=${Date.now()}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  try {
    return decodeStoredSnapshot(await res.json())
  } catch {
    return null
  }
}

export async function writeGithubSnapshot(snapshot: DeskSnapshot) {
  const token = githubToken()
  if (!token) return { ok: false, error: "Missing GITHUB_STORE_TOKEN on the server" }
  const stored = encodeStoredSnapshot(snapshot)
  const url = `https://api.github.com/repos/${DESK_REPO}/contents/${DESK_SNAPSHOT_FILE}`
  const current = await fetch(`${url}?ref=${DESK_BRANCH}`, { headers: githubHeaders(), cache: "no-store" })
  const sha = current.ok ? ((await current.json()) as { sha?: string }).sha : undefined
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Save shared desk ${snapshot.savedAt}`,
      content: Buffer.from(JSON.stringify(stored)).toString("base64"),
      branch: DESK_BRANCH,
      sha,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, error: `GitHub ${res.status}: ${body.slice(0, 180)}` }
  }
  return { ok: true }
}

export function pickNewer(local: DeskSnapshot, remote: DeskSnapshot | null): DeskSnapshot {
  if (!remote) return local
  if (remote.source === "staff" && local.source !== "staff") return remote
  if (local.source === "staff" && remote.source !== "staff") return local
  if (remote.savedAt && remote.savedAt >= (local.savedAt || "")) return remote
  return local
}
