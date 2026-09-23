"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentPhoto } from "@/components/student-photo"
import {
  ClassBadge,
  ContactBadge,
  ContactLabelBadge,
  EnrollmentBadge,
  PhotoshootBadge,
  PlanBadge,
  ProgramBadge,
  SubscriptionBadge,
} from "@/components/status-badge"
import { StaffNotesEditor } from "@/components/staff-notes-editor"
import { StudentIdField } from "@/components/student-id-field"
import { EmptyState, Field, NativeSelect, Panel } from "@/components/ui-helpers"
import { LabelsEditor } from "@/components/labels-editor"
import { NewsletterPanel, ProfileCategoryEditor } from "@/components/student-tag-editor"
import { PaymentMiniCalendar } from "@/components/payment-mini-calendar"
import {
  PaymentAmountInput,
  PaymentDateInput,
  PaymentItemSelect,
  PaymentStatusSelect,
} from "@/components/payment-row-edit"
import { countsFor, useStore } from "@/lib/store"
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhone,
  formatStudentId,
  fullName,
  todayISO,
} from "@/lib/format"
import {
  biweeklyFridays,
  buildPaymentSchedule,
  fillCountForStudent,
  paymentFromScheduleRow,
  paymentSourceLabel,
} from "@/lib/schedule"
import {
  highlightTone,
  isAcademyOverdue,
  isContact,
  isCollectionsStudent,
  isFinishingSoon,
  isPaidInFull,
  isPausedStudent,
  isPendingStudent,
  isSubscriberOverdue,
  isSubscriberStudent,
  remainingPayments,
} from "@/lib/alerts"
import { uniqueContactLabels, isNewsletterRecipient, toggleStudentList } from "@/lib/contacts-labels"
import {
  DESK_STATUS_OPTIONS,
  ENROLLMENT_LABELS,
  CONTACT_LABELS,
  PHOTO_LABELS,
  PLAN_LABELS,
  SUB_LABELS,
} from "@/lib/constants"
import { catalogItemForStudent, SUBSCRIPTION_ITEM } from "@/lib/square"
import type {
  ClassType,
  EnrollmentStatus,
  PaymentPlan,
  PaymentRecord,
  PhotoshootStatus,
  Student,
  StudentTrack,
  SubscriptionStatus,
} from "@/lib/types"

type ScheduleDraft = { key: string; date: string; amount: string }

function newDraftKey() {
  return `row-${Math.random().toString(36).slice(2, 10)}`
}

function blankScheduleDraft(count = 1): ScheduleDraft[] {
  return Array.from({ length: count }, () => ({ key: newDraftKey(), date: "", amount: "" }))
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "payments" ? "payments" : "overview"
  const {
    students,
    attendance,
    feedback,
    payments,
    updateStudent,
    addFeedback,
    addPayments,
    ensureSchedulePayment,
    removePayment,
    removeAttendance,
    photoshoots,
    photoshootPlacements,
    setPhotoshootPlacement,
  } = useStore()
  const student = students.find((s) => s.id === id)
  const [note, setNote] = useState("")
  const [noteClass, setNoteClass] = useState<ClassType | "">("modeling")
  const [draftRows, setDraftRows] = useState<ScheduleDraft[]>(() => blankScheduleDraft())
  const [calendarOpen, setCalendarOpen] = useState(false)

  const records = useMemo(
    () => attendance.filter((a) => a.studentId === id).sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)),
    [attendance, id],
  )
  const notes = useMemo(
    () => feedback.filter((f) => f.studentId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [feedback, id],
  )
  const bills = useMemo(
    () =>
      payments
        .filter((p) => p.studentId === id)
        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [payments, id],
  )
  const schedule = useMemo(
    () => (student ? buildPaymentSchedule(student, bills) : []),
    [student, bills],
  )
  const counts = countsFor(records)
  const tone = student ? highlightTone(student) : "none"
  const labels = student ? uniqueContactLabels(student) : []
  const contactLabel = student?.contactCategory ? CONTACT_LABELS[student.contactCategory] : ""
  const showContactBadge =
    !!student &&
    isContact(student) &&
    !!contactLabel &&
    !labels.some((label) => label.toLowerCase() === contactLabel.toLowerCase())

  if (!student) {
    return (
      <EmptyState
        title="Talent not found"
        description="That ID is not on the roster. Head back to Talent and search by name."
      />
    )
  }

  function saveNote() {
    if (!note.trim() || !student) return
    addFeedback({
      studentId: student.id,
      author: "Staff",
      classType: noteClass || undefined,
      body: note.trim(),
    })
    setNote("")
    toast.success("Feedback saved on their profile.")
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      {isAcademyOverdue(student) ? (
        <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-100/80 p-4 dark:bg-rose-950/50 sepia:bg-rose-200">
          <p className="font-heading text-xl text-rose-900 dark:text-rose-100 sepia:text-rose-950">
            Overdue
          </p>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-50/90 sepia:text-rose-950">
            {formatMoney(student.nextPaymentAmount)} due {formatDate(student.nextPaymentDate)}.
          </p>
        </div>
      ) : null}

      {isSubscriberOverdue(student) ? (
        <div className="mb-4 rounded-2xl border border-orange-400/45 bg-orange-100/80 p-4 dark:bg-orange-950/45 sepia:bg-orange-200">
          <p className="font-heading text-xl text-orange-900 dark:text-orange-100 sepia:text-orange-950">
            Sub overdue
          </p>
          <p className="mt-1 text-sm text-orange-800 dark:text-orange-50/90 sepia:text-orange-950">
            {formatMoney(student.nextPaymentAmount)} due {formatDate(student.nextPaymentDate)}.
          </p>
        </div>
      ) : null}

      {isCollectionsStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-100/80 p-4 dark:bg-amber-950/40 sepia:bg-amber-200">
          <p className="font-heading text-xl text-amber-900 dark:text-amber-100 sepia:text-amber-950">
            {student.enrollmentStatus === "cancelling" ? "Cancelling" : "Collections"}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-50/90 sepia:text-amber-950">
            {student.nextPaymentAmount
              ? `${formatMoney(student.nextPaymentAmount)} due ${formatDate(student.nextPaymentDate)}.`
              : "Not mixed with overdue."}
          </p>
        </div>
      ) : null}

      {isPausedStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-violet-400/40 bg-violet-100/80 p-4 dark:bg-violet-950/40 sepia:bg-violet-200">
          <p className="font-heading text-xl text-violet-900 dark:text-violet-100 sepia:text-violet-950">
            Paused
          </p>
          <p className="mt-1 text-sm text-violet-800 dark:text-violet-50/90 sepia:text-violet-950">
            On hold — not on the floor.
          </p>
        </div>
      ) : null}

      {isContact(student) ? (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/8 p-4">
          <p className="font-heading text-xl text-primary">Contact</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact only — not on the enrollment roster.
          </p>
        </div>
      ) : null}

      {isPendingStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-fuchsia-400/45 bg-fuchsia-100/80 p-4 dark:bg-fuchsia-950/40">
          <p className="font-heading text-xl text-fuchsia-900 dark:text-fuchsia-100">
            Pending
          </p>
          <p className="mt-1 text-sm text-fuchsia-800 dark:text-fuchsia-50/90">
            {student.startDate ? `Starts ${formatDate(student.startDate)}.` : "No start date yet."}
          </p>
        </div>
      ) : null}

      {isFinishingSoon(student) ? (
        <div className="mb-4 rounded-2xl border border-lime-400/45 bg-lime-100/80 p-4 dark:bg-lime-950/40 sepia:bg-lime-200">
          <p className="font-heading text-xl text-lime-900 dark:text-lime-100 sepia:text-lime-950">
            Wrapping up
          </p>
          <p className="mt-1 text-sm text-lime-800 dark:text-lime-50/90 sepia:text-lime-950">
            {remainingPayments(student)} payment{(remainingPayments(student) ?? 0) === 1 ? "" : "s"} left.
          </p>
        </div>
      ) : null}

      {isPaidInFull(student) ? (
        <div className="mb-4 rounded-2xl border border-emerald-400/45 bg-emerald-100/80 p-4 dark:bg-emerald-950/40 sepia:bg-emerald-200">
          <p className="font-heading text-xl text-emerald-900 dark:text-emerald-100 sepia:text-emerald-950">
            Paid in full
          </p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-50/90 sepia:text-emerald-950">
            No remaining tuition.
          </p>
        </div>
      ) : null}

      <Panel className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <StudentPhoto
            student={student}
            size="xl"
            editable
            onUpload={(photoUrl) => {
              updateStudent(student.id, { photoUrl })
              toast.success("Photo saved on this device.")
            }}
          />
          <div className="min-w-0 flex-1">
            {formatStudentId(student.id) ? (
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {formatStudentId(student.id)}
              </p>
            ) : null}
            <h1
              className={`font-heading text-2xl leading-tight md:text-3xl ${
                tone === "overdue"
                  ? "text-rose-800 dark:text-rose-200"
                  : tone === "subscriberOverdue"
                    ? "text-orange-900 dark:text-orange-100"
                    : tone === "collections"
                    ? "text-amber-900 dark:text-amber-200"
                    : tone === "paused"
                      ? "text-violet-900 dark:text-violet-200"
                      : tone === "pending"
                        ? "text-fuchsia-900 dark:text-fuchsia-100"
                        : tone === "finishing"
                          ? "text-lime-800 dark:text-lime-100"
                          : tone === "pif"
                            ? "text-emerald-900 dark:text-emerald-100"
                          : ""
              }`}
            >
              {fullName(student)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {isContact(student) ? null : <ProgramBadge program={student.program} track={student.track} />}
              {isContact(student) || student.paymentPlan === "none" || student.paymentPlan === "subscription" ? null : (
                <PlanBadge plan={student.paymentPlan} />
              )}
              {student.enrollmentStatus === "pending" ||
              student.enrollmentStatus === "overdue" ||
              student.enrollmentStatus === "declined" ||
              student.enrollmentStatus === "paused" ||
              student.enrollmentStatus === "collections" ||
              student.enrollmentStatus === "cancelling" ? (
                <EnrollmentBadge
                  status={student.enrollmentStatus}
                  subscriber={isSubscriberStudent(student)}
                />
              ) : null}
              {student.subscriptionStatus !== "none" &&
              (student.program !== "subscriber" || student.subscriptionStatus !== "active") ? (
                <SubscriptionBadge status={student.subscriptionStatus} />
              ) : null}
              {showContactBadge ? <ContactBadge category={student.contactCategory} /> : null}
              {student.photoshootStatus !== "none" ? (
                <PhotoshootBadge status={student.photoshootStatus} />
              ) : null}
              {labels.map((label) => (
                <ContactLabelBadge
                  key={label}
                  label={label}
                  onRemove={() => updateStudent(student.id, toggleStudentList(student, label))}
                />
              ))}
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <StudentIdField
                student={student}
                onChanged={(nextId) => {
                  const tab = searchParams.get("tab")
                  router.replace(tab === "payments" ? `/students/${nextId}?tab=payments` : `/students/${nextId}`)
                }}
              />
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Email</dt>
                <dd>{student.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Phone</dt>
                <dd>{formatPhone(student.phone)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Age</dt>
                <dd>{student.age ?? "—"}</dd>
              </div>
              {isContact(student) ? null : (
                <>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Start date</dt>
                <dd>{formatDate(student.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Payments left</dt>
                <dd>
                  {student.paymentPlan !== "pp" ? (
                    remainingPayments(student) == null ? "—" : remainingPayments(student)
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      className="mt-1 h-8 w-24"
                      value={student.installmentsLeft ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value
                        updateStudent(student.id, {
                          installmentsLeft: raw === "" ? null : Math.max(0, Number(raw)),
                        })
                      }}
                    />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Next payment</dt>
                <dd>
                  {formatMoney(student.nextPaymentAmount)} · {formatDate(student.nextPaymentDate)}
                </dd>
              </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </Panel>

      <Tabs defaultValue={initialTab}>
        <TabsList variant="line" className="mb-4 h-auto min-h-8 w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isNewsletterRecipient(student) ? <TabsTrigger value="newsletter">Newsletter</TabsTrigger> : null}
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Feedback</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="photoshoot">Photoshoot</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel>
              <p className="text-xs text-muted-foreground uppercase">Modeling</p>
              <p className="font-heading text-3xl leading-none">{counts.modeling}</p>
              <p className="text-xs text-muted-foreground">class check-ins</p>
            </Panel>
            <Panel>
              <p className="text-xs text-muted-foreground uppercase">Acting</p>
              <p className="font-heading text-3xl leading-none">{counts.acting}</p>
              <p className="text-xs text-muted-foreground">class check-ins</p>
            </Panel>
            <Panel>
              <p className="text-xs text-muted-foreground uppercase">Next Square</p>
              <p className="font-heading text-3xl leading-none">{formatMoney(student.nextPaymentAmount)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(student.nextPaymentDate)}</p>
            </Panel>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="grid gap-3">
              <h2 className="font-heading text-xl">{isContact(student) ? "Contact" : "Enrollment"}</h2>
              {isContact(student) ? null : (
                <>
                  <Field label="Status">
                    <NativeSelect
                      value={student.enrollmentStatus === "declined" ? "overdue" : student.enrollmentStatus}
                      onChange={(e) =>
                        updateStudent(student.id, {
                          enrollmentStatus: e.target.value as EnrollmentStatus,
                        })
                      }
                    >
                      {DESK_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {ENROLLMENT_LABELS[status]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  {student.deskLocks?.status ? (
                    <button
                      type="button"
                      className="text-left text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() =>
                        updateStudent(student.id, { deskLocks: { ...student.deskLocks, status: false } })
                      }
                    >
                      Desk tag — keep this status
                    </button>
                  ) : null}
                </>
              )}
              <Field label="Program">
                <NativeSelect
                  value={
                    student.program === "subscriber"
                      ? "subscriber"
                      : student.program === "prospect"
                        ? "prospect"
                        : student.track === "modeling"
                          ? "modeling"
                          : student.track === "acting"
                            ? "acting"
                            : "academy"
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "subscriber") {
                      updateStudent(student.id, { program: "subscriber", track: "none", paymentPlan: "subscription" })
                      return
                    }
                    if (value === "prospect") {
                      updateStudent(student.id, { program: "prospect", track: "none" })
                      return
                    }
                    const track = value as StudentTrack
                    updateStudent(student.id, {
                      program: "academy",
                      track: track === "modeling" || track === "acting" ? track : "academy",
                    })
                  }}
                >
                  <option value="academy">Academy</option>
                  <option value="modeling">Modeling</option>
                  <option value="acting">Acting</option>
                  <option value="subscriber">Subscriber</option>
                  <option value="prospect">Contact</option>
                </NativeSelect>
              </Field>
              {isContact(student) ? null : (
              <Field label="Plan">
                <NativeSelect
                  value={student.paymentPlan}
                  onChange={(e) =>
                    updateStudent(student.id, { paymentPlan: e.target.value as PaymentPlan })
                  }
                >
                  {Object.entries(PLAN_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              )}
              {isContact(student) || student.paymentPlan !== "pp" ? null : (
                <Field label="Payments left">
                  <Input
                    type="number"
                    min={0}
                    value={student.installmentsLeft ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value
                      updateStudent(student.id, {
                        installmentsLeft: raw === "" ? null : Math.max(0, Number(raw)),
                      })
                    }}
                  />
                </Field>
              )}
              <Field label="Lists">
                <ProfileCategoryEditor student={student} />
              </Field>
              <Field label="Tags">
                <LabelsEditor
                  labels={student.labels || []}
                  onChange={(labels) => updateStudent(student.id, { labels })}
                />
              </Field>
            </Panel>
            <Panel>
              <StaffNotesEditor student={student} />
            </Panel>
          </div>
        </TabsContent>

        {isNewsletterRecipient(student) ? (
        <TabsContent value="newsletter">
          <Panel>
            <NewsletterPanel student={student} />
          </Panel>
        </TabsContent>
        ) : null}

        <TabsContent value="attendance">
          <Panel>
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <span>Modeling {counts.modeling}</span>
              <span>Acting {counts.acting}</span>
              <span>Subscriber {counts.subscriber}</span>
            </div>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {records.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{formatDateTime(row.checkedInAt)}</p>
                      {row.notes ? (
                        <p className="text-xs text-muted-foreground">{row.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <ClassBadge type={row.classType} />
                      <Button variant="ghost" size="xs" onClick={() => removeAttendance(row.id)}>
                        Undo
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="payments">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-xl">Add payment schedule</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setCalendarOpen(true)}>
                <CalendarDays className="size-3.5" />
                Dates
              </Button>
            </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[420px] table-fixed text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-[42%] px-3 py-2 font-medium">Run date</th>
                      <th className="w-[42%] px-3 py-2 font-medium">Amount</th>
                      <th className="w-[16%] px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((row) => (
                      <tr key={row.key} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            className="h-9 w-full"
                            value={row.date}
                            onChange={(e) =>
                              setDraftRows((rows) =>
                                rows.map((r) => (r.key === row.key ? { ...r, date: e.target.value } : r)),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-9 w-full"
                            placeholder="104.00"
                            value={row.amount}
                            onChange={(e) =>
                              setDraftRows((rows) =>
                                rows.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)),
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={draftRows.length <= 1}
                            onClick={() =>
                              setDraftRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== row.key)))
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDraftRows((rows) => [...rows, { key: newDraftKey(), date: "", amount: "" }])}
                >
                  Add row
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const first = draftRows.find((r) => r.date && r.amount)
                    if (!first) {
                      toast.error("Enter a Friday date and amount on the first filled row, then fill every two weeks.")
                      return
                    }
                    const count = fillCountForStudent(student)
                    setDraftRows(
                      biweeklyFridays(first.date, count).map((date) => ({
                        key: newDraftKey(),
                        date,
                        amount: first.amount,
                      })),
                    )
                  }}
                >
                  Fill every 2 weeks
                </Button>
                <Button
                  onClick={() => {
                    const ready = draftRows
                      .map((row) => ({
                        date: row.date,
                        amount: Number(row.amount),
                      }))
                      .filter((row) => row.date && Number.isFinite(row.amount) && row.amount > 0)
                    if (!ready.length) {
                      toast.error("Add at least one date and amount.")
                      return
                    }
                    const today = todayISO()
                    addPayments(
                      ready.map((row) => ({
                        studentId: student.id,
                        amount: row.amount,
                        paidAmount: 0,
                        balance: row.amount,
                        dueDate: row.date,
                        paidDate: "",
                        status: row.date < today ? "overdue" : "scheduled",
                        method: "other",
                        squareInvoiceId: "",
                        notes: "Desk schedule",
                        itemId: "",
                        itemName: "Desk schedule",
                        itemDescription: "",
                        itemKind: student.program === "subscriber" ? "subscriber" : "academy",
                        source: "manual",
                      })),
                    )
                    setDraftRows(blankScheduleDraft())
                    toast.success(
                      ready.length === 1
                        ? "Payment date saved. It will show on Calendar and Alerts when due."
                        : `${ready.length} payments saved. They will show on Calendar and Alerts when due.`,
                    )
                  }}
                >
                  Save schedule
                </Button>
              </div>
            <div className="mt-8 mb-6 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="border-b border-border p-3 sm:border-b-0 sm:border-r">
                  <Field label="Amount due">
                    <Input
                      type="number"
                      className="h-9 w-full"
                      value={student.nextPaymentAmount ?? ""}
                      onChange={(e) =>
                        updateStudent(student.id, {
                          nextPaymentAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="p-3">
                  <Field label="Next payment date">
                    <Input
                      type="date"
                      className="h-9 w-full"
                      value={student.nextPaymentDate}
                      onChange={(e) => updateStudent(student.id, { nextPaymentDate: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>
            {schedule.length > 0 ? (
              <div className="mb-4">
                <h2 className="mb-3 font-heading text-xl">Payment calendar</h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Source</th>
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="w-10 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row, index) => {
                        const bill =
                          (row.paymentId ? bills.find((item) => item.id === row.paymentId) : undefined) ??
                          ({ ...paymentFromScheduleRow(student, row), id: "" } as PaymentRecord)
                        const save = (patch: Partial<PaymentRecord>) => {
                          ensureSchedulePayment(student, row, patch)
                          if (patch.dueDate !== undefined) {
                            const isNext =
                              !student.nextPaymentDate ||
                              row.date === student.nextPaymentDate ||
                              patch.dueDate <= (student.nextPaymentDate || patch.dueDate)
                            if (isNext) {
                              updateStudent(student.id, {
                                nextPaymentDate: patch.dueDate,
                                nextPaymentAmount:
                                  patch.amount !== undefined ? patch.amount : student.nextPaymentAmount,
                              })
                            }
                          }
                        }
                        return (
                        <tr key={`${row.date}-${row.source}-${row.paymentId || index}`} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            <PaymentDateInput bill={bill} onPatch={save} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{paymentSourceLabel(row.source)}</td>
                          <td className="px-3 py-2">
                            <PaymentItemSelect student={student} bill={bill} onPatch={save} />
                          </td>
                          <td className="px-3 py-2">
                            <PaymentAmountInput bill={bill} field="amount" onPatch={save} />
                          </td>
                          <td className="px-3 py-2">
                            <PaymentStatusSelect bill={bill} onPatch={save} />
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                if (bill.id) {
                                  removePayment(bill.id)
                                  toast.message("Payment removed from the schedule.")
                                  return
                                }
                                updateStudent(student.id, { nextPaymentDate: "", nextPaymentAmount: null })
                                toast.message("Payment removed from the schedule.")
                              }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No Square invoice or payment due on file.</p>
            )}
          </Panel>
          <PaymentMiniCalendar
            student={student}
            payments={bills}
            open={calendarOpen}
            onOpenChange={setCalendarOpen}
          />
        </TabsContent>

        <TabsContent value="notes">
          <Panel className="grid gap-4">
            <h2 className="font-heading text-xl">Class performance</h2>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <Field label="Class">
                <NativeSelect
                  value={noteClass}
                  onChange={(e) => setNoteClass(e.target.value as ClassType | "")}
                >
                  <option value="modeling">Modeling</option>
                  <option value="acting">Acting</option>
                  <option value="subscriber">Subscriber</option>
                  <option value="">General</option>
                </NativeSelect>
              </Field>
              <Field label="Note">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How did they do in class? Presence, posing, scene work, professionalism…"
                  rows={3}
                />
              </Field>
            </div>
            <Button onClick={saveNote} className="w-fit">
              Save feedback
            </Button>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No class feedback yet.</p>
            ) : (
              <ul className="grid gap-3">
                {notes.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span>{item.author}</span>
                      {item.classType ? <ClassBadge type={item.classType} /> : null}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{item.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="subscription">
          <Panel className="grid gap-3">
            <Field label="Subscription status">
              <NativeSelect
                value={student.subscriptionStatus}
                onChange={(e) =>
                  updateStudent(student.id, {
                    subscriptionStatus: e.target.value as SubscriptionStatus,
                  })
                }
              >
                {Object.entries(SUB_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <SquareSubscriptionCopy student={student} payments={payments} />
            <p className="text-sm text-muted-foreground">
              Use Interested when someone on a payment plan wants the subscriber track — several
              academy talent already have that flag from the workbook.
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="photoshoot">
          <Panel className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Pick a month, then Scheduled / Headshots / Full / Refresh / Received for that shoot only.
            </p>
            {photoshoots.map((shoot) => {
              const row = photoshootPlacements.find(
                (p) => p.studentId === student.id && p.shootId === shoot.id,
              )
              return (
                <Field key={shoot.id} label={`${shoot.label}${shoot.archived ? " · prior" : ""}`}>
                  <NativeSelect
                    value={row?.status || "none"}
                    onChange={(e) =>
                      setPhotoshootPlacement(student.id, shoot.id, e.target.value as PhotoshootStatus)
                    }
                  >
                    {Object.entries(PHOTO_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )
            })}
            <Field label="Shoot notes">
              <Textarea
                value={student.photoshootNotes}
                onChange={(e) => updateStudent(student.id, { photoshootNotes: e.target.value })}
                rows={4}
              />
            </Field>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SquareSubscriptionCopy({
  student,
  payments,
}: {
  student: Student
  payments: PaymentRecord[]
}) {
  const billed = catalogItemForStudent(student, payments)
  const item =
    billed.kind === "subscriber" ? billed : SUBSCRIPTION_ITEM
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">
        Square · {item.name}
        {item.price != null ? ` · ${formatMoney(item.price)}` : ""}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{item.description}</p>
    </div>
  )
}
