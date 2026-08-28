"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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
  fullName,
  smsHref,
  telHref,
} from "@/lib/format"
import {
  attendanceMonthCount,
  isFinishingSoon,
  isOverdueStudent,
  remainingPayments,
} from "@/lib/alerts"
import { sendDeskNotice } from "@/lib/send-notice"
import {
  ENROLLMENT_LABELS,
  PHOTO_LABELS,
  PLAN_LABELS,
  PROGRAM_LABELS,
  SUB_LABELS,
} from "@/lib/constants"
import { catalogItemForStudent, SUBSCRIPTION_ITEM } from "@/lib/square"
import type {
  ClassType,
  EnrollmentStatus,
  PaymentPlan,
  PaymentRecord,
  PhotoshootStatus,
  Program,
  Student,
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
  const counts = countsFor(records)

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

      {isOverdueStudent(student) ? (
        <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-950/50 p-4">
          <p className="font-heading text-2xl text-rose-100">Overdue — student alert</p>
          <p className="mt-1 text-sm text-rose-50/90">
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

      {isFinishingSoon(student, attendance) ? (
        <div className="mb-4 rounded-2xl border border-teal-400/40 bg-teal-950/40 p-4">
          <p className="font-heading text-2xl text-teal-100">Wrapping up</p>
          <p className="mt-1 text-sm text-teal-50/90">
            {remainingPayments(student)} payment
            {(remainingPayments(student) ?? 0) === 1 ? "" : "s"} left on a 6-payment plan, and{" "}
            {attendanceMonthCount(attendance, student.id)} months of class check-ins. Highlighted in
            teal on the roster — a good time to talk subscription.
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
              className={`font-heading text-4xl md:text-5xl ${isOverdueStudent(student) ? "text-rose-200" : isFinishingSoon(student, attendance) ? "text-teal-200" : ""}`}
            >
              {fullName(student)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProgramBadge program={student.program} />
              <EnrollmentBadge status={student.enrollmentStatus} />
              <SubscriptionBadge status={student.subscriptionStatus} />
              <DocusignBadge status={student.docusignStatus} />
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
              <Link
                href="/check-in"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                Check in
              </Link>
            </div>
          </div>
        </div>
      </Panel>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4 w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="docusign">DocuSign</TabsTrigger>
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
              <h2 className="font-heading text-2xl">Enrollment</h2>
              <Field label="Status">
                <NativeSelect
                  value={student.enrollmentStatus}
                  onChange={(e) =>
                    updateStudent(student.id, {
                      enrollmentStatus: e.target.value as EnrollmentStatus,
                    })
                  }
                >
                  {Object.entries(ENROLLMENT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Program">
                <NativeSelect
                  value={student.program}
                  onChange={(e) => updateStudent(student.id, { program: e.target.value as Program })}
                >
                  {Object.entries(PROGRAM_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
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
                        {formatDate(bill.dueDate)}
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
            <Field label="Photoshoot status">
              <NativeSelect
                value={student.photoshootStatus}
                onChange={(e) =>
                  updateStudent(student.id, {
                    photoshootStatus: e.target.value as PhotoshootStatus,
                  })
                }
              >
                {Object.entries(PHOTO_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
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
