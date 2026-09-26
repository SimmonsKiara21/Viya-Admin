import catalog from "@/data/square.json"
import type { PaymentRecord, SquareCatalogItem, SquareItemKind, Student, SubscriptionPlan } from "./types"

export const SQUARE_ITEMS = catalog.items as SquareCatalogItem[]
export const SQUARE_SYNCED_AT = catalog.syncedAt as string
export const SQUARE_SKIPPED = (catalog.skipped ?? []) as { name: string; reason: string }[]

export const SUBSCRIPTION_ITEM = SQUARE_ITEMS.find((i) => i.id === "va-subscription")!
export const SUBSCRIPTION_OG_ITEM = SQUARE_ITEMS.find((i) => i.id === "va-subscription-og")!
export const SUBSCRIPTION_PLUS_ITEM = SQUARE_ITEMS.find((i) => i.id === "va-subscription-plus")!

export const SUBSCRIPTION_PLANS: {
  id: Exclude<SubscriptionPlan, "none">
  item: SquareCatalogItem
  label: string
}[] = [
  { id: "standard", item: SUBSCRIPTION_ITEM, label: "Standard · $51.49" },
  { id: "og", item: SUBSCRIPTION_OG_ITEM, label: "OG · $4.99 / $5.14" },
  { id: "plus", item: SUBSCRIPTION_PLUS_ITEM, label: "$100 plan" },
]

export function itemForSubscriptionPlan(plan: SubscriptionPlan | undefined) {
  if (plan === "og") return SUBSCRIPTION_OG_ITEM
  if (plan === "plus") return SUBSCRIPTION_PLUS_ITEM
  if (plan === "standard") return SUBSCRIPTION_ITEM
  return null
}

export function subscriptionPlanFromItem(item: SquareCatalogItem | undefined): SubscriptionPlan {
  if (!item) return "none"
  if (item.id === SUBSCRIPTION_OG_ITEM.id) return "og"
  if (item.id === SUBSCRIPTION_PLUS_ITEM.id) return "plus"
  if (item.id === SUBSCRIPTION_ITEM.id) return "standard"
  return "none"
}

export function subscriptionPlanFromAmount(amount: number | null | undefined): Exclude<SubscriptionPlan, "none"> {
  if (amount != null && Number.isFinite(amount) && amount >= 95) return "plus"
  if (amount != null && Number.isFinite(amount) && amount <= 8) return "og"
  return "standard"
}

export function subscriptionPlanPatch(
  student: Student,
  plan: Exclude<SubscriptionPlan, "none">,
): Partial<Student> {
  const item = itemForSubscriptionPlan(plan)
  return {
    subscriptionPlan: plan,
    nextPaymentAmount: item?.price ?? student.nextPaymentAmount,
    deskLocks: { ...student.deskLocks, subscription: true },
  }
}

export function resolvedSubscriptionPlan(student: Student, payments: PaymentRecord[] = []): Exclude<SubscriptionPlan, "none"> {
  if (student.subscriptionPlan === "plus" || student.subscriptionPlan === "og" || student.subscriptionPlan === "standard") {
    return student.subscriptionPlan
  }
  const fromItem = subscriptionPlanFromItem(catalogItemForStudent(student, payments))
  return fromItem === "none" ? subscriptionPlanFromAmount(student.nextPaymentAmount) : fromItem
}

export function planIdForStudent(student: Student, payments: PaymentRecord[]) {
  const plan = resolvedSubscriptionPlan(student, payments)
  return itemForSubscriptionPlan(plan)?.id || SUBSCRIPTION_ITEM.id
}

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
  const planned = itemForSubscriptionPlan(student.subscriptionPlan)
  if (planned) return planned
  const bill = primaryPayment(payments, student.id)
  return itemById(bill?.itemId) ?? defaultItemForStudent(student)
}

export function itemKindLabel(kind: SquareItemKind) {
  if (kind === "subscriber") return "Sub"
  if (kind === "event") return "Modeling and acting training"
  if (kind === "fee") return "Collections"
  return "Modeling and acting training"
}

export function paymentItemLabel(student: Student | undefined, bill: Pick<PaymentRecord, "itemId" | "itemKind">) {
  if (
    student?.enrollmentStatus === "collections" ||
    student?.enrollmentStatus === "cancelling" ||
    bill.itemId === "cancellation" ||
    bill.itemKind === "fee"
  ) {
    return "Collections"
  }
  if (bill.itemKind === "subscriber" || student?.program === "subscriber" || student?.paymentPlan === "subscription") {
    return "Sub"
  }
  return "Modeling and acting training"
}

export function displayPaymentNotes(notes: string) {
  const value = (notes || "").trim()
  if (!value) return ""
  if (value === "Desk schedule") return ""
  if (value.startsWith("Square invoice") || value.startsWith("Square subscription")) return ""
  return value
}

export function openBalance(payments: PaymentRecord[]) {
  return payments
    .filter((p) => ["due", "overdue", "declined"].includes(p.status))
    .reduce((sum, p) => sum + (p.balance ?? p.amount), 0)
}
