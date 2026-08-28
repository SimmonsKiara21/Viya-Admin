import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { JotformCheckIn } from "./jotform"
import { parseJotformList } from "./jotform"

const FILE = path.join(process.cwd(), "data", "jotform-live.json")

let memory: JotformCheckIn[] = []
let loaded = false

async function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = await readFile(FILE, "utf8")
    memory = parseJotformList(JSON.parse(raw))
  } catch {
    memory = []
  }
}

export async function readLiveCheckIns(): Promise<JotformCheckIn[]> {
  await load()
  return memory
}

export async function rememberCheckIns(rows: JotformCheckIn[]) {
  await load()
  const seen = new Set(memory.map((row) => row.id))
  const added: JotformCheckIn[] = []
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue
    seen.add(row.id)
    added.push(row)
  }
  if (!added.length) return memory
  memory = [...added, ...memory].slice(0, 800)
  try {
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, JSON.stringify({ updatedAt: new Date().toISOString(), checkIns: memory }, null, 2))
  } catch {
    /* read-only deploy */
  }
  return memory
}
