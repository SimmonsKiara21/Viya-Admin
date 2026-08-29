import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Student } from "./types"

const FILE = path.join(process.cwd(), "data", "enrollment-live.json")

export type EnrollmentLive = {
  updatedAt: string
  source: "upload" | "webhook" | "csv"
  students: Student[]
}

let memory: EnrollmentLive | null = null
let loaded = false

async function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as EnrollmentLive
    if (Array.isArray(raw.students) && raw.students.length) memory = raw
  } catch {
    memory = null
  }
}

export async function readEnrollmentLive(): Promise<EnrollmentLive | null> {
  await load()
  return memory
}

export async function writeEnrollmentLive(students: Student[], source: EnrollmentLive["source"]) {
  const next: EnrollmentLive = {
    updatedAt: new Date().toISOString(),
    source,
    students,
  }
  memory = next
  loaded = true
  try {
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, JSON.stringify(next, null, 2))
  } catch {
    /* read-only deploy — keep in-memory for this instance */
  }
  return next
}
