"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentPhoto } from "@/components/student-photo"
import {
  ClassBadge,
  ContactBadge,
  DocusignBadge,
  EnrollmentBadge,
  PaymentBadge,
  PhotoshootBadge,
  ProgramBadge,
  SubscriptionBadge,
} from "@/components/status-badge"
import { EmptyState, Field, NativeSelect, Panel } from "@/components/ui-helpers"
import { NotifyComposer } from "@/components/notify-composer"
import { DocusignFields, withDocusignDefaults } from "@/components/docusign-fields"
import { countsFor, useStore } from "@/lib/store"
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhone,
  formatShortDate,
  fullName,
  smsHref,
  telHref,
} from "@/lib/format"
import { buildPaymentSchedule } from "@/lib/schedule"
import {
  highlightTone,
  isAcademyOverdue,
  isContact,
  isCollectionsStudent,
  isFinishingSoon,
  isPausedStudent,
  isPendingStudent,
  isSubscriberOverdue,
  isSubscriberStudent,
  remainingPayments,
} from "@/lib/alerts"
import { sendDeskNotice } from "@/lib/send-notice"
import {
  ENROLLMENT_LABELS,
  CONTACT_LABELS,
  PHOTO_LABELS,
  PLAN_LABELS,
  SUB_LABELS,
} from "@/lib/constants"
import { catalogItemForStudent, SUBSCRIPTION_ITEM } from "@/lib/square"
import type {
  ClassType,
  ContactCategory,
  EnrollmentStatus,
  PaymentPlan,
  PaymentRecord,
  PhotoshootStatus,
  Student,
  StudentTrack,
  SubscriptionStatus,
} from "@/lib/types"
import { cn } from "@/lib/utils"

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const {
    students,
    attendance,
    feedback,
    payments,
    updateStudent,
    addFeedback,
    removeAttendance,
    addNotification,
    photoshoots,
    photoshootPlacements,
    setPhotoshootPlacement,
  } = useStore()
  const student = students.find((s) => s.id === id)
  const [note, setNote] = useState("")
  const [noteClass, setNoteClass] = useState<ClassType | "">("modeling")

  const records = useMemo(
    () => attendance.filter((a) => a.studentId === id).sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt)),
    [attendance, id],
  )
  const notes = useMemo(
    () => feedback.filter((f) => f.studentId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [feedback, id],
  )
  const bills = useMemo(
    () => payments.filter((p) => p.studentId === id).sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [payments, id],
  )
  const schedule = useMemo(
    () => (student ? buildPaymentSchedule(student, payments) : []),
    [student, payments],
  )
  const counts = countsFor(records)
  const tone = student ? highlightTone(student) : "none"

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="That ID is not on the roster. Head back to Students and search by name."
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
          <p className="font-heading text-2xl text-rose-900 dark:text-rose-100 sepia:text-rose-950">
            Academy overdue
          </p>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-50/90 sepia:text-rose-950">
            Payment of {formatMoney(student.nextPaymentAmount)} was due{" "}
            {formatDate(student.nextPaymentDate)}. Their name is highlighted in red on every list.
          </p>
          <Button
            className="mt-3"
            onClick={() =>
              sendDeskNotice({
                students: [student],
                channel: "sms",
                templateId: "overdue-sms",
                addNotification,
              })
            }
          >
            Send student alert
          </Button>
        </div>
      ) : null}

      {isSubscriberOverdue(student) ? (
        <div className="mb-4 rounded-2xl border border-orange-400/45 bg-orange-100/80 p-4 dark:bg-orange-950/45 sepia:bg-orange-200">
          <p className="font-heading text-2xl text-orange-900 dark:text-orange-100 sepia:text-orange-950">
            Subscriber overdue
          </p>
          <p className="mt-1 text-sm text-orange-800 dark:text-orange-50/90 sepia:text-orange-950">
            Subscription payment of {formatMoney(student.nextPaymentAmount)} was due{" "}
            {formatDate(student.nextPaymentDate)}. Highlighted in orange so it is not mixed with
            academy training follow-up.
          </p>
          <Button
            className="mt-3"
            onClick={() =>
              sendDeskNotice({
                students: [student],
                channel: "sms",
                templateId: "overdue-sms",
                addNotification,
              })
            }
          >
            Send subscriber alert
          </Button>
        </div>
      ) : null}

      {isCollectionsStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-100/80 p-4 dark:bg-amber-950/40 sepia:bg-amber-200">
          <p className="font-heading text-2xl text-amber-900 dark:text-amber-100 sepia:text-amber-950">
            Collections
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-50/90 sepia:text-amber-950">
            This account is in collections
            {student.nextPaymentAmount
              ? ` · ${formatMoney(student.nextPaymentAmount)} due ${formatDate(student.nextPaymentDate)}`
              : ""}
            . Highlighted in amber on every list so it is not mixed in with a regular overdue follow-up.
          </p>
        </div>
      ) : null}

      {isPausedStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-violet-400/40 bg-violet-100/80 p-4 dark:bg-violet-950/40 sepia:bg-violet-200">
          <p className="font-heading text-2xl text-violet-900 dark:text-violet-100 sepia:text-violet-950">
            Paused
          </p>
          <p className="mt-1 text-sm text-violet-800 dark:text-violet-50/90 sepia:text-violet-950">
            Enrollment is on hold. Highlighted in violet so the desk does not check them in by accident.
          </p>
        </div>
      ) : null}

      {isContact(student) ? (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/8 p-4">
          <p className="font-heading text-2xl text-primary">Contact</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Not on the current enrollment tab. Categorize them here, or move them to Students if they
            actually become pending on the workbook.
          </p>
        </div>
      ) : null}

      {isPendingStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-sky-400/40 bg-sky-100/80 p-4 dark:bg-sky-950/40 sepia:bg-sky-200">
          <p className="font-heading text-2xl text-sky-900 dark:text-sky-100 sepia:text-sky-950">
            Pending start
          </p>
          <p className="mt-1 text-sm text-sky-800 dark:text-sky-50/90 sepia:text-sky-950">
            Not on the floor yet
            {student.startDate ? ` · first class ${formatDate(student.startDate)}` : ""}. Highlighted
            in blue so DocuSign, deposit, and first class stay on the radar.
          </p>
        </div>
      ) : null}

      {isFinishingSoon(student) ? (
        <div className="mb-4 rounded-2xl border border-lime-400/45 bg-lime-100/80 p-4 dark:bg-lime-950/40 sepia:bg-lime-200">
          <p className="font-heading text-2xl text-lime-900 dark:text-lime-100 sepia:text-lime-950">
            Fewer than 3 payments left
          </p>
          <p className="mt-1 text-sm text-lime-800 dark:text-lime-50/90 sepia:text-lime-950">
            {remainingPayments(student)} payment
            {(remainingPayments(student) ?? 0) === 1 ? "" : "s"} left on a 6-payment plan. Started{" "}
            {formatDate(student.startDate)} (May 2026 or earlier). Highlighted in lime — a good time to
            talk subscription.
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
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              #{student.id}
            </p>
            <h1
              className={`font-heading text-4xl md:text-5xl ${
                tone === "overdue"
                  ? "text-rose-800 dark:text-rose-200"
                  : tone === "subscriberOverdue"
                    ? "text-orange-900 dark:text-orange-100"
                    : tone === "collections"
                    ? "text-amber-900 dark:text-amber-200"
                    : tone === "paused"
                      ? "text-violet-900 dark:text-violet-200"
                      : tone === "pending"
                        ? "text-sky-900 dark:text-sky-200"
                        : tone === "finishing"
                          ? "text-lime-800 dark:text-lime-100"
                          : ""
              }`}
            >
              {fullName(student)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProgramBadge program={student.program} track={student.track} />
              <EnrollmentBadge
                status={student.enrollmentStatus}
                subscriber={isSubscriberStudent(student)}
              />
              <SubscriptionBadge status={student.subscriptionStatus} />
              <DocusignBadge status={student.docusignStatus} />
              {isContact(student) ? <ContactBadge category={student.contactCategory} /> : null}
              {student.photoshootStatus !== "none" ? (
                <PhotoshootBadge status={student.photoshootStatus} />
              ) : null}
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
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
                <dt className="text-xs text-muted-foreground uppercase">Start date</dt>
                <dd>{formatDate(student.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Payments left</dt>
                <dd>
                  {remainingPayments(student) == null ? "—" : remainingPayments(student)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">Next payment</dt>
                <dd>
                  {formatMoney(student.nextPaymentAmount)} · {formatDate(student.nextPaymentDate)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {student.phone ? (
                <>
                  <a href={telHref(student.phone)} className={cn(buttonVariants({ size: "sm" }))}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                  <a
                    href={smsHref(student.phone)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <MessageSquare className="size-3.5" />
                    Text
                  </a>
                </>
              ) : null}
              {student.email ? (
                <a
                  href={`mailto:${student.email}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Mail className="size-3.5" />
                  Gmail
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </Panel>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4 w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="docusign">DocuSign</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Feedback</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="photoshoot">Photoshoot</TabsTrigger>
          <TabsTrigger value="notify">Notify</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel>
              <p className="text-xs text-muted-foreground uppercase">Modeling</p>
              <p className="font-heading text-4xl">{counts.modeling}</p>
              <p className="text-xs text-muted-foreground">class check-ins</p>
            </Panel>
            <Panel>
              <p className="text-xs text-muted-foreground uppercase">Acting</p>
              <p className="font-heading text-4xl">{counts.acting}</p>
              <p className="text-xs text-muted-foreground">class check-ins</p>
            </Panel>
            <Panel>
              <p className="text-xs text-muted-foreground uppercase">Next Square</p>
              <p className="font-heading text-4xl">{formatMoney(student.nextPaymentAmount)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(student.nextPaymentDate)}</p>
            </Panel>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="grid gap-3">
              <h2 className="font-heading text-2xl">{isContact(student) ? "Contact" : "Enrollment"}</h2>
              {isContact(student) ? (
                <Field label="Category">
                  <NativeSelect
                    value={student.contactCategory || "new"}
                    onChange={(e) =>
                      updateStudent(student.id, { contactCategory: e.target.value as ContactCategory })
                    }
                  >
                    {Object.entries(CONTACT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              ) : (
              <Field label="Status">
                <NativeSelect
                  value={student.enrollmentStatus}
                  onChange={(e) =>
                    updateStudent(student.id, {
                      enrollmentStatus: e.target.value as EnrollmentStatus,
                    })
                  }
                >
                  {Object.entries(ENROLLMENT_LABELS)
                    .filter(([k]) => k !== "contact")
                    .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
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
                  <option value="prospect">Prospect</option>
                </NativeSelect>
              </Field>
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
            </Panel>
            <Panel>
              <h2 className="mb-3 font-heading text-2xl">Staff notes</h2>
              <Textarea
                value={student.notes}
                onChange={(e) => updateStudent(student.id, { notes: e.target.value })}
                rows={8}
                placeholder="Payment history, parent contacts, absences…"
              />
            </Panel>
          </div>
        </TabsContent>

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
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Field label="Amount due">
                <Input
                  type="number"
                  value={student.nextPaymentAmount ?? ""}
                  onChange={(e) =>
                    updateStudent(student.id, {
                      nextPaymentAmount: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>
              <Field label="Next payment date">
                <Input
                  type="date"
                  value={student.nextPaymentDate}
                  onChange={(e) => updateStudent(student.id, { nextPaymentDate: e.target.value })}
                />
              </Field>
            </div>
            {schedule.length > 0 ? (
              <div className="mb-6">
                <h2 className="mb-2 font-heading text-2xl">Payment schedule</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  From Square and the 6-payment academy plan. Open invoices show the Square due date
                  and remaining balance.
                </p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Paid</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row, index) => (
                        <tr key={`${row.date}-${index}`} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 tabular-nums">{formatShortDate(row.date)}</td>
                          <td className="px-3 py-2">
                            <p>{row.label}</p>
                            {row.invoiceId ? (
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {row.fromSquare ? "Square" : "Plan"} · {row.invoiceId}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatMoney(row.amount)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatMoney(row.paidAmount)}</td>
                          <td className="px-3 py-2">
                            <PaymentBadge status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Square invoices on file.</p>
            ) : (
              <ul className="divide-y divide-border">
                {bills.map((bill) => (
                  <li key={bill.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                    <div className="min-w-0 max-w-xl">
                      <p className="font-medium">{bill.itemName || "Square invoice"}</p>
                      <p className="mt-0.5 text-sm">
                        {formatMoney(bill.amount)}
                        {bill.paidAmount ? ` · paid ${formatMoney(bill.paidAmount)}` : ""}
                        {bill.balance ? ` · balance ${formatMoney(bill.balance)}` : ""} ·{" "}
                        {formatShortDate(bill.dueDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bill.method === "square" ? "Square" : bill.method} · {bill.squareInvoiceId}
                      </p>
                      {bill.itemDescription ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {bill.itemDescription}
                        </p>
                      ) : null}
                    </div>
                    <PaymentBadge status={bill.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="docusign">
          <Panel className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl">DocuSign</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Store the envelope they were sent. Open the signing link or mark it signed when
                  it comes back.
                </p>
              </div>
              {student.docusignUrl ? (
                <a
                  href={student.docusignUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open DocuSign
                </a>
              ) : null}
            </div>
            <DocusignFields
              value={student}
              onChange={(patch) =>
                updateStudent(student.id, withDocusignDefaults({ ...student, ...patch }))
              }
            />
          </Panel>
        </TabsContent>

        <TabsContent value="notes">
          <Panel className="grid gap-4">
            <h2 className="font-heading text-2xl">Class performance</h2>
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
              academy students already have that flag from the workbook.
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

        <TabsContent value="notify">
          <Panel>
            <NotifyComposer presetStudents={[student]} compact />
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
      <p className="text-xs font-medium tracking-wide text-[oklch(0.78_0.08_85)] uppercase">
        Square · {item.name}
        {item.price != null ? ` · ${formatMoney(item.price)}` : ""}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{item.description}</p>
    </div>
  )
}
