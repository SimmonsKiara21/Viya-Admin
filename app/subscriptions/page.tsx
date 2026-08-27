"use client"

import { useMemo, useState } from "react"
import { StudentRow } from "@/components/student-row"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { SUB_LABELS } from "@/lib/constants"
import { catalogItemForStudent, SUBSCRIPTION_ITEM, SUBSCRIPTION_OG_ITEM } from "@/lib/square"
import { formatMoney } from "@/lib/format"
import type { SubscriptionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function SubscriptionsPage() {
  const { students, payments } = useStore()
  const [filter, setFilter] = useState<SubscriptionStatus | "all">("all")

  const list = useMemo(() => {
    const base = students.filter((s) =>
      filter === "all"
        ? s.subscriptionStatus !== "none" || s.program === "subscriber"
        : s.subscriptionStatus === filter,
    )
    return base.sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [students, filter])

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title="Subscriptions"
        description="The Square subscriber items, with the copy we sell them under. Roster is enrollment students only."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="text-xs font-medium tracking-wide text-[oklch(0.78_0.08_85)] uppercase">
            Square item · {formatMoney(SUBSCRIPTION_ITEM.price)}
          </p>
          <h2 className="mt-1 font-heading text-2xl">{SUBSCRIPTION_ITEM.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{SUBSCRIPTION_ITEM.description}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-medium tracking-wide text-[oklch(0.78_0.08_85)] uppercase">
            Square item · {formatMoney(SUBSCRIPTION_OG_ITEM.price)}
          </p>
          <h2 className="mt-1 font-heading text-2xl">{SUBSCRIPTION_OG_ITEM.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{SUBSCRIPTION_OG_ITEM.description}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Grandfathered rate. Live Square invoices often show {formatMoney(5.14)} with tax.
          </p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "active", "interested", "paused", "cancelled"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              filter === s
                ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                : "border-border text-muted-foreground",
            )}
          >
            {s === "all" ? "All with a sub" : SUB_LABELS[s]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nobody in this subscription view"
          description="Mark Interested on a student profile to add them here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            {list.length} people
          </div>
          <div className="divide-y divide-border px-2 py-1">
            {list.map((student) => {
              const item = catalogItemForStudent(student, payments)
              return (
                <div key={student.id}>
                  <StudentRow student={student} />
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    Square: {item.name}
                    {item.price != null ? ` · ${formatMoney(item.price)}` : ""}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
