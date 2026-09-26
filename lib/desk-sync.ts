import { DESK_PASSWORD } from "./constants"
import type { AppData } from "./types"

export const DESK_SNAPSHOT_FILE = "data/desk-shared.json"

export type DeskSnapshot = {
  source: "seed" | "staff"
  savedAt: string
  build: string
  data: AppData | null
  encoding?: "gzip-base64"
  blob?: string
}

export type SharedPullDecision = {
  publishedAt: string
  appliedAt: string
  staleLocal: boolean
  followShared: boolean
}

export function emptyDeskSnapshot(build: string): DeskSnapshot {
  return { source: "seed", savedAt: "", build, data: null }
}

export function snapshotFromPayload(payload: unknown, build: string): DeskSnapshot | null {
  if (!payload || typeof payload !== "object") return null
  const row = payload as Partial<DeskSnapshot> & { password?: string }
  if (row.password && row.password !== DESK_PASSWORD) return null
  if (!row.data || typeof row.data !== "object") return null
  if (!Array.isArray((row.data as AppData).students)) return null
  return {
    source: "staff",
    savedAt: typeof row.savedAt === "string" && row.savedAt ? row.savedAt : new Date().toISOString(),
    build,
    data: row.data as AppData,
  }
}

/** Home Talent of 35 / 17 / 8 is the old phone cache — never treat that as the live desk. */
export function isStaleDeskCache(currentTalentCount: number) {
  return currentTalentCount > 0 && currentTalentCount <= 40
}

/**
 * Shared staff snapshot wins on phones and any desk that already follows
 * the live copy. The computer that still has the unpublished correct roster
 * keeps it until Save publishes.
 */
export function shouldUseSharedSnapshot(shared: DeskSnapshot | null, local: SharedPullDecision) {
  if (!shared || shared.source !== "staff" || !shared.data) return false
  if (local.staleLocal) return true
  if (local.followShared && shared.savedAt !== local.appliedAt) return true
  if (local.publishedAt && shared.savedAt > local.publishedAt) return true
  return false
}

export async function encodeDeskPayload(value: unknown) {
  if (typeof CompressionStream === "undefined") return value
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))
    const buffer = await new Response(stream).arrayBuffer()
    return { encoding: "gzip-base64" as const, blob: bytesToBase64(new Uint8Array(buffer)) }
  } catch {
    return value
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
