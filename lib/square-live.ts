import { invoicesFromSquareApi, type SquareInvoiceRow } from "./square-sync"

const SQUARE_VERSION = "2025-01-23"

function squareHost() {
  const env = (process.env.SQUARE_ENVIRONMENT || "production").toLowerCase()
  return env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com"
}

function locationId() {
  return process.env.SQUARE_LOCATION_ID || "LC790E490Z6B9"
}

async function squareGet(path: string, token: string, query?: Record<string, string>) {
  const url = new URL(path, squareHost())
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  }
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const errors = json.errors as { detail?: string }[] | undefined
    throw new Error(errors?.[0]?.detail || `Square ${res.status}`)
  }
  return json
}

async function squarePost(path: string, token: string, body: unknown) {
  const url = new URL(path, squareHost())
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const errors = json.errors as { detail?: string }[] | undefined
    throw new Error(errors?.[0]?.detail || `Square ${res.status}`)
  }
  return json
}

async function listAllInvoices(token: string) {
  const invoices: unknown[] = []
  let cursor = ""
  for (let i = 0; i < 20; i++) {
    const json = await squareGet("/v2/invoices", token, {
      location_id: locationId(),
      limit: "200",
      ...(cursor ? { cursor } : {}),
    })
    const page = Array.isArray(json.invoices) ? json.invoices : []
    invoices.push(...page)
    cursor = typeof json.cursor === "string" ? json.cursor : ""
    if (!cursor) break
  }
  return invoices
}

async function customerNames(token: string, invoices: unknown[]) {
  const ids = new Set<string>()
  for (const row of invoices) {
    if (!row || typeof row !== "object") continue
    const recipient = (row as { primary_recipient?: { customer_id?: string } }).primary_recipient
    if (recipient?.customer_id) ids.add(recipient.customer_id)
  }
  const names: Record<string, string> = {}
  const list = [...ids]
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100)
    const json = await squarePost("/v2/customers/bulk-retrieve", token, { customer_ids: chunk })
    const responses = (json.responses || json.customers) as Record<string, { customer?: { given_name?: string; family_name?: string } }> | undefined
    if (!responses || typeof responses !== "object") continue
    for (const [id, entry] of Object.entries(responses)) {
      const customer = entry?.customer
      const name = `${customer?.given_name || ""} ${customer?.family_name || ""}`.trim()
      if (name) names[id] = name
    }
  }
  return names
}

export async function fetchLiveSquareInvoices(): Promise<{ invoices: SquareInvoiceRow[]; source: "api" | "none"; error?: string }> {
  const token = process.env.SQUARE_ACCESS_TOKEN || ""
  if (!token) return { invoices: [], source: "none" }
  try {
    const raw = await listAllInvoices(token)
    const names = await customerNames(token, raw)
    return { invoices: invoicesFromSquareApi(raw, names), source: "api" }
  } catch (err) {
    return { invoices: [], source: "none", error: err instanceof Error ? err.message : "Square API error" }
  }
}
