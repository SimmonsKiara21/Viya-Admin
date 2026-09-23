"use client"

import { useMemo, useState } from "react"
import { FilterChip, FilterGroup } from "@/components/filter-chip"
import { StudentRow } from "@/components/student-row"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { SUB_LABELS } from "@/lib/constants"
import {
  catalogItemForStudent,
  SUBSCRIPTION_ITEM,
  SUBSCRIPTION_OG_ITEM,
  SUBSCRIPTION_PLUS_ITEM,
} from "@/lib/square"
import { formatMoney } from "@/lib/format"
import { isContact, isSubscriberStudent } from "@/lib/alerts"
import type { PaymentRecord, Student, SubscriptionStatus } from "@/lib/types"
import { ROSTER_SORT_LABELS, ROSTER_SORTS, sortStudents, type RosterSort } from "@/lib/roster-sort"

const PLAN_COPY =
  "Your Potential Unlocked - Anytime, All the Time. As a subscriber, you're not just staying connected - you're staying ahead. Get Unlimited training, exclusive access to master classes, private training, our full facility, members-only discounts, and a growing community of passionate talent. This is your all-access pass to keep growing, creating, and leveling up - because the journey never stops."

const PLANS = [
  { item: SUBSCRIPTION_ITEM, blurb: "Standard Square subscription." },
  { item: SUBSCRIPTION_OG_ITEM, blurb: "Grandfathered OG rate. Live Square invoices often show $5.14 with tax." },
  { item: SUBSCRIPTION_PLUS_ITEM, blurb: "Square $100 subscription. One person is on this plan." },
] as const

function billedAmount(student: Student, payments: PaymentRecord[]) {
  const item = catalogItemForStudent(student, payments)
  const bill = payments
    .filter((p) => p.studentId === student.id && p.itemKind === "subscriber")
    .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""))[0]
  return bill?.amount ?? student.nextPaymentAmount ?? item.price
}

function isHundredDollarPlan(student: Student, payments: PaymentRecord[]) {
  const item = catalogItemForStudent(student, payments)
  if (item.id === SUBSCRIPTION_PLUS_ITEM.id) return true
  const name = `${student.firstName} ${student.lastName}`.toLowerCase()
  if (name.includes("scarlett") && name.includes("petroff")) return true
  if (student.program !== "subscriber") return false
  const amount = billedAmount(student, payments)
  return amount != null && amount >= 95 && amount <= 105
}

function planIdForStudent(student: Student, payments: PaymentRecord[]) {
  if (isHundredDollarPlan(student, payments)) return SUBSCRIPTION_PLUS_ITEM.id
  const item = catalogItemForStudent(student, payments)
  if (item.id === SUBSCRIPTION_OG_ITEM.id) return SUBSCRIPTION_OG_ITEM.id
  const amount = billedAmount(student, payments)
  if (amount != null && amount <= 8) return SUBSCRIPTION_OG_ITEM.id
  return SUBSCRIPTION_ITEM.id
}

export default function SubscriptionsPage() {
  const { students, payments } = useStore()
  const [filter, setFilter] = useState<SubscriptionStatus | "all">("all")
  const [sort, setSort] = useState<RosterSort>("az")

  const list = useMemo(() => {
    const base = students.filter((s) => {
      if (!isSubscriberStudent(s)) return false
      if (filter === "all") return true
      if (filter === "active") {
        return s.subscriptionStatus !== "paused" && s.subscriptionStatus !== "cancelled"
      }
      return s.subscriptionStatus === filter
    })
    return sortStudents(base, sort)
  }, [students, filter, sort])

  const byPlan = useMemo(() => {
    const groups: Record<string, Student[]> = {
      [SUBSCRIPTION_ITEM.id]: [],
      [SUBSCRIPTION_OG_ITEM.id]: [],
      [SUBSCRIPTION_PLUS_ITEM.id]: [],
    }
    for (const student of list) {
      const id = planIdForStudent(student, payments)
      groups[id].push(student)
    }
    return groups
  }, [list, payments])

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title="Subscriptions"
        description="Three Square plans: $49.99, OG $4.99, and the $100 plan (one subscriber)."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {PLANS.map(({ item, blurb }) => (
          <Panel key={item.id}>
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              Square · {item.price != null ? formatMoney(item.price) : "other rate"}
              {` · ${byPlan[item.id]?.length ?? 0}`}
            </p>
            <h2 className="mt-1 font-heading text-xl">{item.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description || PLAN_COPY}</p>
          </Panel>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <FilterGroup label="Status">
          {(["all", "active", "interested", "paused", "cancelled"] as const).map((s) => (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {s === "all" ? "All with a sub" : SUB_LABELS[s]}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Sort">
          {ROSTER_SORTS.map((option) => (
            <FilterChip key={option} active={sort === option} onClick={() => setSort(option)}>
              {ROSTER_SORT_LABELS[option]}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nobody in this subscription view"
          description="Mark Interested on a profile to add them here."
        />
      ) : (
        <div className="grid gap-6">
          {PLANS.map(({ item }) => {
            const people = byPlan[item.id] ?? []
            if (!people.length) return null
            return (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card/60">
                <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                  {item.name}
                  {item.price != null ? ` · ${formatMoney(item.price)}` : ""} · {people.length}
                </div>
                <div className="divide-y divide-border px-2 py-1">
                  {people.map((student) => {
                    const billed = catalogItemForStudent(student, payments)
                    return (
                      <div key={student.id}>
                        <StudentRow student={student} />
                        <p className="px-4 pb-3 text-xs text-muted-foreground">
                          {isContact(student)
                            ? "Active Subscribers"
                            : billed.price != null
                              ? `${billed.name} · ${formatMoney(billed.price)}`
                              : billed.name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
