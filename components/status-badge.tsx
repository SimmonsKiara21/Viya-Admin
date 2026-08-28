import { Badge } from "@/components/ui/badge"
import {
  CLASS_LABELS,
  DOCUSIGN_LABELS,
  ENROLLMENT_LABELS,
  PAYMENT_LABELS,
  PHOTO_LABELS,
  PROGRAM_LABELS,
  SUB_LABELS,
} from "@/lib/constants"
import { cn } from "@/lib/utils"
import type {
  ClassType,
  DocusignStatus,
  EnrollmentStatus,
  PaymentStatus,
  PhotoshootStatus,
  Program,
  SubscriptionStatus,
} from "@/lib/types"

const enrollmentClass: Record<EnrollmentStatus, string> = {
  current: "border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
  pending: "border-sky-500/40 bg-sky-500/12 text-sky-800 dark:text-sky-200",
  declined: "border-rose-500/35 bg-rose-500/15 text-rose-800 dark:text-rose-200",
  pif: "border-primary/40 bg-primary/14 text-primary",
  overdue: "border-rose-500/35 bg-rose-500/15 text-rose-800 dark:text-rose-200",
  paused: "border-violet-500/40 bg-violet-500/12 text-violet-800 dark:text-violet-200",
  collections: "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200",
}

const paymentClass: Record<PaymentStatus, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/12 text-emerald-200",
  due: "border-sky-500/30 bg-sky-500/12 text-sky-200",
  overdue: "border-orange-500/35 bg-orange-500/15 text-orange-200",
  declined: "border-rose-500/35 bg-rose-500/15 text-rose-200",
  scheduled: "border-zinc-500/35 bg-zinc-500/15 text-zinc-300",
}

export function EnrollmentBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", enrollmentClass[status])}>
      {ENROLLMENT_LABELS[status]}
    </Badge>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", paymentClass[status])}>
      {PAYMENT_LABELS[status]}
    </Badge>
  )
}

export function ProgramBadge({ program }: { program: Program }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {PROGRAM_LABELS[program]}
    </Badge>
  )
}

export function ClassBadge({ type }: { type: ClassType }) {
  const cls =
    type === "modeling"
      ? "border-[oklch(0.78_0.08_85/0.4)] bg-[oklch(0.78_0.08_85/0.12)] text-[oklch(0.9_0.06_85)]"
      : type === "acting"
        ? "border-violet-500/30 bg-violet-500/12 text-violet-200"
        : "border-teal-500/30 bg-teal-500/12 text-teal-200"
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {CLASS_LABELS[type]}
    </Badge>
  )
}

export function PhotoshootBadge({ status }: { status: PhotoshootStatus }) {
  return (
    <Badge variant="outline" className="font-medium">
      {PHOTO_LABELS[status]}
    </Badge>
  )
}

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  if (status === "none") return null
  const cls =
    status === "active"
      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-200"
      : status === "interested"
        ? "border-[oklch(0.78_0.08_85/0.4)] bg-[oklch(0.78_0.08_85/0.12)] text-[oklch(0.9_0.06_85)]"
        : "border-zinc-500/35 bg-zinc-500/15 text-zinc-300"
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {SUB_LABELS[status]}
    </Badge>
  )
}

export function DocusignBadge({ status }: { status: DocusignStatus }) {
  if (status === "none") return null
  const cls =
    status === "signed"
      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-200"
      : status === "declined" || status === "expired"
        ? "border-rose-500/35 bg-rose-500/15 text-rose-200"
        : "border-sky-500/30 bg-sky-500/12 text-sky-200"
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      DocuSign · {DOCUSIGN_LABELS[status]}
    </Badge>
  )
}
