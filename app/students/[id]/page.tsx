"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
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
  OverdueSinceBadge,
  PhotoshootBadge,
  PlanBadge,
  ProgramBadge,
  SubscriptionBadge,
} from "@/components/status-badge"
import { StaffNotesEditor } from "@/components/staff-notes-editor"
import { StudentIdField } from "@/components/student-id-field"
import { StudentProfileEdit } from "@/components/student-profile-edit"
import { EmptyState, Field, NativeSelect, Panel } from "@/components/ui-helpers"
import { LabelsEditor } from "@/components/labels-editor"
import { NewsletterPanel, ProfileCategoryEditor } from "@/components/student-tag-editor"
import { StudentPaymentsTab } from "@/components/student-payments-tab"
import { countsFor, useStore } from "@/lib/store"
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhone,
  formatStudentId,
  fullName,
} from "@/lib/format"
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
  overdueSinceDate,
  showsOverdueSince,
} from "@/lib/alerts"
import { uniqueContactLabels, isNewsletterRecipient, toggleStudentList } from "@/lib/contacts-labels"
import {
  DESK_STATUS_OPTIONS,
  DESK_SUB_STATUSES,
  ENROLLMENT_LABELS,
  CONTACT_LABELS,
  PHOTO_LABELS,
  PLAN_LABELS,
  SUB_LABELS,
} from "@/lib/constants"
import {
  catalogItemForStudent,
  itemForSubscriptionPlan,
  subscriptionPlanFromItem,
  SUBSCRIPTION_ITEM,
  SUBSCRIPTION_PLANS,
} from "@/lib/square"
import type {
  ClassType,
  EnrollmentStatus,
  PaymentPlan,
  PaymentRecord,
  PhotoshootStatus,
  Student,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/lib/types"

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
    removeAttendance,
    photoshoots,
    photoshootPlacements,
    setPhotoshootPlacement,
  } = useStore()
  const student = students.find((s) => s.id === id)
  const [note, setNote] = useState("")
  const [noteClass, setNoteClass] = useState<ClassType | "">("modeling")
  const [photoshootId, setPhotoshootId] = useState("")

  const records = useMemo(
    () => attendance.filter((a) => a.studentId === id).sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)),
    [attendance, id],
  )
  const notes = useMemo(
    () => feedback.filter((f) => f.studentId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [feedback, id],
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

  const missedSince = overdueSinceDate(student, payments)
  const paymentsLeft = remainingPayments(student)
  const selectedShoot =
    photoshoots.find((s) => s.id === photoshootId) ??
    photoshoots.find((s) => !s.archived) ??
    photoshoots[0]
  const selectedPlacement = selectedShoot
    ? photoshootPlacements.find((p) => p.studentId === student.id && p.shootId === selectedShoot.id)
    : undefined

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
            {[
              `Overdue since ${formatDate(missedSince)}`,
              student.nextPaymentAmount != null ? formatMoney(student.nextPaymentAmount) : "",
              paymentsLeft === 0
                ? "no payments left"
                : paymentsLeft != null
                  ? `${paymentsLeft} payment${paymentsLeft === 1 ? "" : "s"} left`
                  : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            .
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
            {[
              missedSince ? `Overdue since ${formatDate(missedSince)}` : "",
              student.nextPaymentAmount != null ? formatMoney(student.nextPaymentAmount) : "",
              paymentsLeft === 0
                ? "no payments left"
                : paymentsLeft != null
                  ? `${paymentsLeft} payment${paymentsLeft === 1 ? "" : "s"} left`
                  : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Not mixed with overdue."}
          </p>
        </div>
      ) : null}

      {isPausedStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-violet-400/40 bg-violet-100/80 p-4 dark:bg-violet-950/40 sepia:bg-violet-200">
          <p className="font-heading text-xl text-violet-900 dark:text-violet-100 sepia:text-violet-950">
            Paused
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
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
              </div>
              <StudentProfileEdit student={student} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {isContact(student) ? null : (
                <ProgramBadge
                  program={isSubscriberStudent(student) ? "subscriber" : student.program}
                />
              )}
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
              {showsOverdueSince(student) ? <OverdueSinceBadge date={missedSince} /> : null}
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
                  router.replace(initialTab === "payments" ? `/students/${nextId}?tab=payments` : `/students/${nextId}`)
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
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Nickname</dt>
                <dd>{student.nickname || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Class time</dt>
                <dd>{student.classTime || "—"}</dd>
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
                    updateStudent(student.id, {
                      program: "academy",
                      track: student.track === "none" ? "academy" : student.track,
                    })
                  }}
                >
                  <option value="academy">Academy</option>
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
          <StudentPaymentsTab student={student} />
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
                    deskLocks: { ...student.deskLocks, subscription: true },
                  })
                }
              >
                {student.subscriptionStatus === "none" || student.subscriptionStatus === "cancelled" ? (
                  <option value={student.subscriptionStatus}>
                    {SUB_LABELS[student.subscriptionStatus]}
                  </option>
                ) : null}
                {DESK_SUB_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SUB_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Subscription plan">
              <NativeSelect
                value={
                  (student.subscriptionPlan !== "none"
                    ? student.subscriptionPlan
                    : subscriptionPlanFromItem(catalogItemForStudent(student, payments))) || "standard"
                }
                onChange={(e) => {
                  const plan = e.target.value as SubscriptionPlan
                  const item = itemForSubscriptionPlan(plan)
                  updateStudent(student.id, {
                    subscriptionPlan: plan,
                    nextPaymentAmount: item?.price ?? student.nextPaymentAmount,
                    deskLocks: { ...student.deskLocks, subscription: true },
                  })
                }}
              >
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <SquareSubscriptionCopy student={student} payments={payments} />
          </Panel>
        </TabsContent>

        <TabsContent value="photoshoot">
          <Panel className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Pick one shoot, set their placement, then measurements and notes.
            </p>
            {photoshoots.length ? (
              <>
                <Field label="Photoshoot">
                  <NativeSelect
                    value={selectedShoot?.id || ""}
                    onChange={(e) => setPhotoshootId(e.target.value)}
                  >
                    {photoshoots.some((s) => !s.archived) ? (
                      <optgroup label="Open">
                        {photoshoots
                          .filter((s) => !s.archived)
                          .map((shoot) => {
                            const row = photoshootPlacements.find(
                              (p) => p.studentId === student.id && p.shootId === shoot.id,
                            )
                            return (
                              <option key={shoot.id} value={shoot.id}>
                                {shoot.label}
                                {row ? ` · ${PHOTO_LABELS[row.status]}` : ""}
                              </option>
                            )
                          })}
                      </optgroup>
                    ) : null}
                    {photoshoots.some((s) => s.archived) ? (
                      <optgroup label="Prior">
                        {photoshoots
                          .filter((s) => s.archived)
                          .map((shoot) => {
                            const row = photoshootPlacements.find(
                              (p) => p.studentId === student.id && p.shootId === shoot.id,
                            )
                            return (
                              <option key={shoot.id} value={shoot.id}>
                                {shoot.label}
                                {row ? ` · ${PHOTO_LABELS[row.status]}` : ""}
                              </option>
                            )
                          })}
                      </optgroup>
                    ) : null}
                  </NativeSelect>
                </Field>
                {selectedShoot ? (
                  <>
                    <Field label="Placement">
                      <NativeSelect
                        value={selectedPlacement?.status || "none"}
                        onChange={(e) =>
                          setPhotoshootPlacement(
                            student.id,
                            selectedShoot.id,
                            e.target.value as PhotoshootStatus,
                          )
                        }
                      >
                        {Object.entries(PHOTO_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    {selectedShoot.notes ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedShoot.notes}</p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No photoshoots yet.</p>
            )}
            <div className="grid gap-3 border-t border-border pt-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Measurements</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["height", "Height", "5'8\""],
                    ["bust", "Bust", "34"],
                    ["waist", "Waist", "25"],
                    ["hips", "Hips", "36"],
                    ["dress", "Dress", "4"],
                    ["shoe", "Shoe", "8"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <Field key={key} label={label}>
                    <Input
                      value={student.measurements[key]}
                      placeholder={placeholder}
                      onChange={(e) =>
                        updateStudent(student.id, {
                          measurements: { ...student.measurements, [key]: e.target.value },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
            <Field label="Photoshoot notes">
              <Textarea
                value={student.photoshootNotes}
                onChange={(e) => updateStudent(student.id, { photoshootNotes: e.target.value })}
                placeholder="Looks, wardrobe, what we want next…"
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
