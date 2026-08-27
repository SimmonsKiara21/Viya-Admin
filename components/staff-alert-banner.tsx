"use client"

import Link from "next/link"
import { useEffect } from "react"
import { toast } from "sonner"
import { Bell } from "lucide-react"
import { useStore } from "@/lib/store"
import { isFinishingSoon, isOverdueStudent } from "@/lib/alerts"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StaffAlertBanner() {
  const { students, attendance } = useStore()
  const overdue = students.filter(isOverdueStudent)
  const finishing = students.filter((s) => isFinishingSoon(s, attendance))

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!overdue.length && !finishing.length) return
    const key = `viya-staff-alert-${overdue.length}-${finishing.length}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    if (overdue.length) {
      toast.warning(
        `${overdue.length} student${overdue.length === 1 ? " is" : "s are"} overdue. Due dates are highlighted in red.`,
      )
    }
    if (finishing.length) {
      toast.message(
        `${finishing.length} student${finishing.length === 1 ? " is" : "s are"} down to 3 or fewer payments with 2+ months of class.`,
      )
    }
  }, [overdue.length, finishing.length])

  if (!overdue.length && !finishing.length) return null

  return (
    <div className="flex flex-col gap-2 border-b border-rose-400/20 bg-rose-950/40 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-rose-100">
        <Bell className="mt-0.5 size-4 shrink-0" />
        <span>
          {overdue.length ? (
            <>
              <strong>{overdue.length} overdue</strong>
              {overdue.length === 1 ? " student needs" : " students need"} a payment follow-up.
            </>
          ) : null}
          {overdue.length && finishing.length ? " " : null}
          {finishing.length ? (
            <>
              <strong className="text-teal-200">{finishing.length} wrapping up</strong> — 3 or fewer
              payments left, with at least two months of check-ins.
            </>
          ) : null}
        </span>
      </p>
      <Link href="/alerts" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
        Open alerts
      </Link>
    </div>
  )
}
