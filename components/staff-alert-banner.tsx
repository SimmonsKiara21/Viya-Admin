"use client"

import Link from "next/link"
import { useEffect } from "react"
import { toast } from "sonner"
import { Bell } from "lucide-react"
import { useStore } from "@/lib/store"
import {
  isAcademyOverdue,
  isCollectionsStudent,
  isFinishingSoon,
  isPausedStudent,
  isPendingStudent,
  isSubscriberOverdue,
} from "@/lib/alerts"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StaffAlertBanner() {
  const { students } = useStore()
  const academyOverdue = students.filter(isAcademyOverdue)
  const subscriberOverdue = students.filter(isSubscriberOverdue)
  const collections = students.filter(isCollectionsStudent)
  const paused = students.filter(isPausedStudent)
  const pending = students.filter(isPendingStudent)
  const finishing = students.filter(isFinishingSoon)
  const total =
    academyOverdue.length +
    subscriberOverdue.length +
    collections.length +
    paused.length +
    pending.length +
    finishing.length

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!total) return
    const key = `viya-staff-alert-${academyOverdue.length}-${subscriberOverdue.length}-${collections.length}-${paused.length}-${pending.length}-${finishing.length}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    if (academyOverdue.length) {
      toast.warning(
        `${academyOverdue.length} academy student${academyOverdue.length === 1 ? " is" : "s are"} overdue. Highlighted in red.`,
      )
    }
    if (subscriberOverdue.length) {
      toast.warning(
        `${subscriberOverdue.length} subscriber${subscriberOverdue.length === 1 ? " is" : "s are"} overdue. Highlighted in orange.`,
      )
    }
    if (collections.length) {
      toast.warning(
        `${collections.length} in collections — highlighted in amber.`,
      )
    }
  }, [
    total,
    academyOverdue.length,
    subscriberOverdue.length,
    collections.length,
    paused.length,
    pending.length,
    finishing.length,
  ])

  if (!total) return null

  const bits: { count: number; label: string; className: string }[] = [
    { count: academyOverdue.length, label: "academy overdue", className: "text-rose-800 dark:text-rose-100" },
    { count: subscriberOverdue.length, label: "subscriber overdue", className: "text-orange-900 dark:text-orange-100" },
    { count: collections.length, label: "collections", className: "text-amber-900 dark:text-amber-200" },
    { count: paused.length, label: "paused", className: "text-violet-900 dark:text-violet-200" },
    { count: pending.length, label: "pending", className: "text-sky-900 dark:text-sky-200" },
    { count: finishing.length, label: "wrapping up", className: "text-lime-800 dark:text-lime-100" },
  ].filter((bit) => bit.count > 0)

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-muted/50 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          {bits.map((bit, index) => (
            <span key={bit.label}>
              {index > 0 ? " · " : null}
              <strong className={bit.className}>
                {bit.count} {bit.label}
              </strong>
            </span>
          ))}
        </span>
      </p>
      <Link href="/alerts" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
        Open alerts
      </Link>
    </div>
  )
}
