"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StudentPhoto } from "@/components/student-photo"
import { EnrollmentBadge } from "@/components/status-badge"
import { useStore } from "@/lib/store"
import { fullName, matchesQuery } from "@/lib/format"
import { highlightTone, isSubscriberStudent } from "@/lib/alerts"
import { cn } from "@/lib/utils"

export function StudentSearch({
  className,
  placeholder = "Look up a student or contact",
}: {
  className?: string
  placeholder?: string
}) {
  const { students, attendance } = useStore()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    return students.filter((s) => matchesQuery(s, query)).slice(0, 8)
  }, [query, students])

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            router.push(`/students/${results[0].id}`)
            setQuery("")
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        className="h-11 rounded-full border-[oklch(0.4_0.03_75)] bg-background/70 pl-10 pr-4 text-base md:text-sm"
        aria-label="Look up a student"
      />
      {open && query.trim() ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No student matches “{query}”.
            </p>
          ) : (
            <ul>
              {results.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/70"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery("")
                      setOpen(false)
                    }}
                  >
                    <StudentPhoto student={student} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-medium",
                          highlightTone(student, attendance) === "overdue" &&
                            "text-rose-800 dark:text-rose-200",
                          highlightTone(student, attendance) === "subscriberOverdue" &&
                            "text-orange-900 dark:text-orange-100",
                          highlightTone(student, attendance) === "collections" &&
                            "text-amber-900 dark:text-amber-200",
                        )}
                      >
                        {fullName(student)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        #{student.id}
                        {["overdue", "declined", "collections"].includes(student.enrollmentStatus)
                          ? ` · due ${student.nextPaymentDate || "—"}`
                          : ` · ${student.email || "no email"} · ${student.phone || "no phone"}`}
                      </p>
                    </div>
                    <EnrollmentBadge
                      status={student.enrollmentStatus}
                      subscriber={isSubscriberStudent(student)}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
