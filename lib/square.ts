import catalog from "@/data/square.json"
import type { PaymentRecord, SquareCatalogItem, SquareItemKind, Student } from "./types"

export const SQUARE_ITEMS = catalog.items as SquareCatalogItem[]
export const SQUARE_SYNCED_AT = catalog.syncedAt as string
export const SQUARE_SKIPPED = (catalog.skipped ?? []) as { name: string; reason: string }[]

export const SUBSCRIPTION_ITEM = SQUARE_ITEMS.find((i) => i.id === "va-subscription")!
export const SUBSCRIPTION_OG_ITEM = SQUARE_ITEMS.find((i) => i.id === "va-subscription-og")!
export const SUBSCRIPTION_PLUS_ITEM = SQUARE_ITEMS.find((i) => i.id === "va-subscription-plus")!

export function itemById(id: string | undefined): SquareCatalogItem | undefined {
  if (!id) return undefined
  return SQUARE_ITEMS.find((item) => item.id === id)
}

export function defaultItemForStudent(student: Student): SquareCatalogItem {
  if (student.program === "subscriber" || student.paymentPlan === "subscription") {
    return SUBSCRIPTION_ITEM
  }
  return SQUARE_ITEMS.find((i) => i.id === "va101") ?? SQUARE_ITEMS[0]
}

export function paymentsForStudent(payments: PaymentRecord[], studentId: string) {
  return payments.filter((p) => p.studentId === studentId)
}

export function primaryPayment(payments: PaymentRecord[], studentId: string): PaymentRecord | undefined {
  const list = paymentsForStudent(payments, studentId)
  const open = list.filter((p) => ["due", "overdue", "declined", "scheduled"].includes(p.status))
  const pool = open.length ? open : list
  return [...pool].sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""))[0]
}

export function catalogItemForStudent(
  student: Student,
  payments: PaymentRecord[],
): SquareCatalogItem {
  const bill = primaryPayment(payments, student.id)
  return itemById(bill?.itemId) ?? defaultItemForStudent(student)
}

export function itemKindLabel(kind: SquareItemKind) {
  if (kind === "subscriber") return "Subscription"
  if (kind === "event") return "Event"
  if (kind === "fee") return "Fee"
  return "Academy training"
}

export function openBalance(payments: PaymentRecord[]) {
  return payments
    .filter((p) => ["due", "overdue", "declined"].includes(p.status))
    .reduce((sum, p) => sum + (p.balance ?? p.amount), 0)
}
