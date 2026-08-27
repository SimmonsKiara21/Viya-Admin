"use client"

import { useMemo, useState } from "react"
import { StudentRow } from "@/components/student-row"
import { EmptyState, PageHeader } from "@/components/ui-helpers"
import { useStore } from "@/lib/store"
import { SUB_LABELS } from "@/lib/constants"
import type { SubscriptionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function SubscriptionsPage() {
  const { students } = useStore()
  const [filter, setFilter] = useState<SubscriptionStatus | "all">("all")

  const list = useMemo(() => {
    const base = students.filter((s) =>
      filter === "all" ? s.subscriptionStatus !== "none" || s.program === "subscriber" : s.subscriptionStatus === filter,
    )
    return base.sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [students, filter])

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title="Subscriptions"
        description="Subscriber roster plus academy students flagged as interested — including notes like Griffin’s 09/01 email and Gabby Anderson."
      />

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
            {list.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
