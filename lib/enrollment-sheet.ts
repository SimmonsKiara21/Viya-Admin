import type { Student } from "./types"
import { applyWorkbookRows, parseEnrollmentCsv } from "./enrollment-sync"
import { ENROLLMENT_SHEET_URL } from "./constants"

export type PublishedTab = { name: string; gid: string; rows: number }

export type PublishedEnrollment = {
  students: Student[]
  added: number
  updated: number
  tabs: PublishedTab[]
  url: string
}

function sheetUrl(base: string, gid: string) {
  const url = new URL(base)
  url.searchParams.set("output", "csv")
  url.searchParams.set("gid", gid)
  url.searchParams.set("single", "true")
  return url.toString()
}

function htmlUrl(base: string) {
  return base.replace(/\/pub\?.*$/, "/pubhtml").replace(/\/pub$/, "/pubhtml")
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "ViyaAdminDesk/1.0" },
  })
  if (!res.ok) throw new Error(`Enrollment sheet ${res.status}`)
  return res.text()
}

export async function listPublishedTabs(base = ENROLLMENT_SHEET_URL): Promise<{ name: string; gid: string }[]> {
  const html = await fetchText(htmlUrl(base))
  const tabs = [...html.matchAll(/items\.push\(\{name:\s*"([^"]+)"[\s\S]*?gid:\s*"(\d+)"/g)].map((m) => ({
    name: m[1].replace(/\\+/g, ""),
    gid: m[2],
  }))
  if (tabs.length) return tabs
  return [{ name: "CURRENT STUDENTS", gid: new URL(base).searchParams.get("gid") || "0" }]
}

function kindOf(name: string) {
  const key = name.toLowerCase()
  if (key.includes("contact")) return "skip" as const
  if (key.includes("sub")) return "subscriptions" as const
  if (key.includes("collection") || key.includes("cancel")) return "collections" as const
  if (key.includes("pending")) return "pending" as const
  return "current" as const
}

const DEFAULTS: Record<string, Partial<Student>> = {
  subscriptions: {
    program: "subscriber",
    paymentPlan: "subscription",
    track: "none",
    enrollmentStatus: "current",
    subscriptionStatus: "active",
  },
  collections: { program: "academy" },
  pending: { program: "academy", enrollmentStatus: "pending" },
  current: { program: "academy" },
}

export async function pullPublishedEnrollment(
  baseStudents: Student[],
  baseUrl = process.env.ENROLLMENT_CSV_URL || ENROLLMENT_SHEET_URL,
): Promise<PublishedEnrollment> {
  const tabs = await listPublishedTabs(baseUrl)
  const order = ["current", "pending", "subscriptions", "collections"]
  const fetched: { kind: string; name: string; gid: string; rows: Partial<Student>[] }[] = []

  for (const tab of tabs) {
    const kind = kindOf(tab.name)
    if (kind === "skip") continue
    const csv = await fetchText(sheetUrl(baseUrl, tab.gid))
    const rows = parseEnrollmentCsv(csv, DEFAULTS[kind] || {})
    fetched.push({ kind, name: tab.name, gid: tab.gid, rows })
  }

  let students = baseStudents.map((s) => ({ ...s }))
  let added = 0
  let updated = 0
  for (const kind of order) {
    const group = fetched.filter((tab) => tab.kind === kind)
    for (const tab of group) {
      if (!tab.rows.length) continue
      const merged = applyWorkbookRows(students, tab.rows, {
        preserveAcademy: kind === "subscriptions",
      })
      students = merged.students
      added += merged.added
      updated += merged.updated
    }
  }

  return {
    students,
    added,
    updated,
    tabs: fetched.map((tab) => ({ name: tab.name, gid: tab.gid, rows: tab.rows.length })),
    url: baseUrl,
  }
}
