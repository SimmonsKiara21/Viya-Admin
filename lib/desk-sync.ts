import { DESK_PASSWORD } from "./constants"
import type { AppData } from "./types"

export const DESK_SNAPSHOT_FILE = "data/desk-shared.json"

export type DeskSnapshot = {
  source: "seed" | "staff"
  savedAt: string
  build: string
  data: AppData | null
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

export function shouldUseSharedSnapshot(shared: DeskSnapshot | null, localSavedAt: string) {
  if (!shared || shared.source !== "staff" || !shared.data) return false
  if (!localSavedAt) return true
  return shared.savedAt >= localSavedAt
}
