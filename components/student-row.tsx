"use client"

import Link from "next/link"
import { StudentPhoto } from "@/components/student-photo"
import { EnrollmentBadge, ProgramBadge } from "@/components/status-badge"
import { formatPhone, fullName } from "@/lib/format"
import type { Student } from "@/lib/types"

export function StudentRow({ student }: { student: Student }) {
  return (
    <Link
      href={`/students/${student.id}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
    >
      <StudentPhoto student={student} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fullName(student)}</p>
        <p className="truncate text-xs text-muted-foreground">
          #{student.id} · {formatPhone(student.phone)} · {student.email || "no email"}
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <ProgramBadge program={student.program} />
        <EnrollmentBadge status={student.enrollmentStatus} />
      </div>
    </Link>
  )
}
