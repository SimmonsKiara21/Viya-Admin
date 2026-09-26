"use client"

import { useMemo, useState } from "react"
import { FilterChip, FilterGroup } from "@/components/filter-chip"
import { Input } from "@/components/ui/input"
import { StudentRow } from "@/components/student-row"
import { SubscriberQuickEdit } from "@/components/subscriber-edit"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { SUB_LABELS } from "@/lib/constants"
import {
  catalogItemForStudent,
  SUBSCRIPTION_ITEM,
  SUBSCRIPTION_OG_ITEM,
  SUBSCRIPTION_PLUS_ITEM,
} from "@/lib/square"
import { formatMoney, matchesQuery } from "@/lib/format"
import { isSubscriberStudent } from "@/lib/alerts"
import { squareSubscriberStanding } from "@/lib/subscriber-billing"
import type { PaymentRecord, Student, SubscriptionStatus } from "@/lib/types"
import { ROSTER_SORT_LABELS, ROSTER_SORTS, sortStudents, type RosterSort } from "@/lib/roster-sort"

const PLAN_COPY =
  "Your Potential Unlocked - Anytime, All the Time. As a subscriber, you're not just staying connected - you're staying ahead. Get Unlimited training, exclusive access to master classes, private training, our full facility, members-only discounts, and a growing community of passionate talent. This is your all-access pass to keep growing, creating, and leveling up - because the journey never stops."

const PLANS = [
  { item: SUBSCRIPTION_ITEM, blurb: "Standard Square subscription, $51.49 with tax." },
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
  if (student.subscriptionPlan === "plus") return SUBSCRIPTION_PLUS_ITEM.id
  if (student.subscriptionPlan === "og") return SUBSCRIPTION_OG_ITEM.id
  if (student.subscriptionPlan === "standard") return SUBSCRIPTION_ITEM.id
  if (isHundredDollarPlan(student, payments)) return SUBSCRIPTION_PLUS_ITEM.id
  const item = catalogItemForStudent(student, payments)
  if (item.id === SUBSCRIPTION_OG_ITEM.id) return SUBSCRIPTION_OG_ITEM.id
  const amount = billedAmount(student, payments)
  if (amount != null && amount <= 8) return SUBSCRIPTION_OG_ITEM.id
  return SUBSCRIPTION_ITEM.id
}

export default function SubscriptionsPage() {
  const { students, payments } = useStore()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<SubscriptionStatus | "all">("active")
  const [sort, setSort] = useState<RosterSort>("az")

  const list = useMemo(() => {
    const base = students.filter((s) => {
      if (!isSubscriberStudent(s)) return false
      if (!matchesQuery(s, query)) return false
      if (filter === "all") return true
      return s.subscriptionStatus === filter
    })
    return sortStudents(base, sort)
  }, [students, query, filter, sort])

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

  const squareCounts = useMemo(() => {
    let current = 0
    let overdue = 0
    let other = 0
    for (const student of list) {
      const standing = squareSubscriberStanding(student, payments)
      if (standing === "current") current += 1
      else if (standing === "overdue") overdue += 1
      else other += 1
    }
    return { current, overdue, other }
  }, [list, payments])

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title="Subscriptions"
        description={`${list.length} people on this desk list only. Square: ${squareCounts.current} current, ${squareCounts.overdue} overdue${squareCounts.other ? `, ${squareCounts.other} with no open invoice yet` : ""}.`}
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
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this tab by name, ID, phone, or email"
          className="h-11 max-w-xl rounded-full px-4"
        />
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
          description="Clear the search, switch status, or set someone to Subscriber on their profile."
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
                  {people.map((student) => (
                    <div key={student.id} className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <StudentRow student={student} context="subscribers" />
                      </div>
                      <div className="flex items-center px-2 pb-2 sm:pb-0">
                        <SubscriberQuickEdit student={student} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
