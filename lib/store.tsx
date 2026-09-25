"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import seed from "@/data/seed.json"
import type {
  AppData,
  AttendanceRecord,
  ClassType,
  ContactCategory,
  FeedbackNote,
  NotificationRecord,
  NotifyGroup,
  PaymentRecord,
  PaymentSource,
  CalendarEvent,
  Photoshoot,
  PhotoshootStatus,
  SquareItemKind,
  Student,
  StudentTrack,
} from "./types"
import { displayStudentId, newId, parseStudentId, todayISO } from "./format"
import { paymentFromScheduleRow, type ScheduleRow } from "./schedule"
import { allNotifyGroups } from "./groups"
import { defaultItemForStudent } from "./square"
import {
  matchJotformCheckIns,
  mergeAttendance,
  replaceAttendanceFromTracker,
  type JotformCheckIn,
} from "./jotform"
import {
  DROPPED_ROSTER_IDS,
  DROPPED_ROSTER_NAMES,
  ENROLLMENT_FREEZE_ID,
  JOTFORM_ATTENDANCE_URL,
  STUDENT_ID_ALIASES,
} from "./constants"
import {
  createPhotoshoot,
  duplicatePhotoshoot as buildPhotoshootCopy,
  mergeLabelPlacements,
  mergePhotoshoots,
  newPlacement,
  placementsFromStudents,
} from "./photoshoots"
import { normalizeMeasurements } from "./measurements"
import { applySquareInvoices, squareFingerprint, type SquareInvoiceRow } from "./square-sync"
import { enrollmentFingerprint, markPaidInFull, mergeEnrollmentStudents } from "./enrollment-sync"
import {
  applyContactLabels,
  categoryFromLabels,
  contactLabelsFingerprint,
  withoutCurrentStudentIfSubscriber,
  withoutNewsletterLabels,
  type ContactLabelRow,
} from "./contacts-labels"
import { mergeDuplicateStudents } from "./merge-duplicates"
import { applyDrivePhotos } from "./photos-overlay"
import { foldName } from "./match-name"
import { normalizeCalendarEvent } from "./calendar-events"
import { applyDeskSubscriberRoster, SUBSCRIBER_ROSTER_ID } from "./desk-subscribers"

const DROPPED_IDS = new Set(DROPPED_ROSTER_IDS)
const DROPPED_NAMES = new Set(DROPPED_ROSTER_NAMES)

function isDroppedStudent(student: Pick<Student, "id" | "firstName" | "lastName">) {
  if (DROPPED_IDS.has(student.id)) return true
  return DROPPED_NAMES.has(foldName(`${student.firstName} ${student.lastName}`))
}

function remapStudentIds(data: AppData): AppData {
  const aliases = STUDENT_ID_ALIASES
  const used = new Set(data.students.map((s) => s.id))
  const students = data.students.map((s) => {
    const next = aliases[s.id]
    if (!next || next === s.id || used.has(next)) return s
    used.delete(s.id)
    used.add(next)
    return { ...s, id: next }
  })
  const map = (id: string) => aliases[id] && students.some((s) => s.id === aliases[id]) ? aliases[id] : id
  return {
    ...data,
    students,
    payments: data.payments.map((p) => ({ ...p, studentId: map(p.studentId) })),
    attendance: data.attendance.map((row) => ({ ...row, studentId: map(row.studentId) })),
    feedback: data.feedback.map((row) => ({ ...row, studentId: map(row.studentId) })),
    photoshootPlacements: data.photoshootPlacements.map((row) => ({ ...row, studentId: map(row.studentId) })),
    notifications: data.notifications.map((note) => ({
      ...note,
      studentIds: note.studentIds.map(map),
    })),
    groups: data.groups.map((group) => ({
      ...group,
      studentIds: group.studentIds.map(map),
    })),
    calendarEvents: (data.calendarEvents || []).map((event) => ({
      ...event,
      studentIds: event.studentIds.map(map),
    })),
  }
}

function reassignStudentId(data: AppData, fromId: string, toId: string): AppData {
  if (!fromId || !toId || fromId === toId) return data
  if (data.students.some((s) => s.id === toId)) return data
  const map = (id: string) => (id === fromId ? toId : id)
  return {
    ...data,
    students: data.students.map((s) => (s.id === fromId ? { ...s, id: toId } : s)),
    payments: data.payments.map((p) => ({ ...p, studentId: map(p.studentId) })),
    attendance: data.attendance.map((row) => ({ ...row, studentId: map(row.studentId) })),
    feedback: data.feedback.map((row) => ({ ...row, studentId: map(row.studentId) })),
    photoshootPlacements: data.photoshootPlacements.map((row) => ({ ...row, studentId: map(row.studentId) })),
    notifications: data.notifications.map((note) => ({
      ...note,
      studentIds: note.studentIds.map(map),
    })),
    groups: data.groups.map((group) => ({
      ...group,
      studentIds: group.studentIds.map(map),
    })),
    calendarEvents: (data.calendarEvents || []).map((event) => ({
      ...event,
      studentIds: event.studentIds.map(map),
    })),
  }
}

export type ChangeStudentIdResult = { ok: true; id: string } | { ok: false; error: string }

function withoutDroppedStudents(data: AppData): AppData {
  const students = data.students.filter((s) => !isDroppedStudent(s))
  const keep = new Set(students.map((s) => s.id))
  return {
    ...data,
    students,
    payments: data.payments.filter((p) => keep.has(p.studentId)),
    attendance: data.attendance.filter((row) => keep.has(row.studentId)),
    feedback: data.feedback.filter((row) => keep.has(row.studentId)),
    photoshootPlacements: data.photoshootPlacements.filter((row) => keep.has(row.studentId)),
  }
}

const STORAGE_KEY = "viya-academy-store-v9"
const LEGACY_KEYS = [
  "viya-academy-store-v8",
  "viya-academy-store-v7",
  "viya-academy-store-v6",
  "viya-academy-store-v5",
  "viya-academy-store-v4",
]
const PHOTOS_KEY = "viya-academy-photos-v1"
const SAVED_AT_KEY = "viya-academy-saved-at-v9"
const ENROLLMENT_FREEZE_KEY = "viya-academy-enrollment-frozen-v1"
const SUBSCRIBER_ROSTER_KEY = "viya-academy-subscribers-v1"
export const DESK_SAVE_EVENT = "viya-desk-save"
const JOTFORM_MS = 15_000
const SQUARE_MS = 60_000
const AUTO_SAVE_MS = 5 * 60_000

function attendanceKey(rows: AttendanceRecord[]) {
  return rows
    .map((row) => row.id)
    .sort()
    .join("|")
}

function loadPhotos(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PHOTOS_KEY) || "{}") as Record<string, string>
  } catch {
    return {}
  }
}

function savePhotos(students: Student[]) {
  const photos: Record<string, string> = {}
  for (const student of students) {
    if (student.photoUrl.startsWith("data:")) photos[student.id] = student.photoUrl
  }
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos))
}

function withPhotos(data: AppData): AppData {
  const photos = loadPhotos()
  const students = applyDrivePhotos(
    data.students.map((s) => (photos[s.id] ? { ...s, photoUrl: photos[s.id] } : s)),
  )
  return { ...data, students }
}

function persistable(data: AppData): AppData {
  return {
    ...data,
    students: data.students.map((s) => ({
      ...s,
      photoUrl: s.photoUrl.startsWith("data:") ? "" : s.photoUrl,
    })),
  }
}

function normalizePayment(p: Partial<PaymentRecord> & { studentId: string; amount: number }): PaymentRecord {
  const paid = p.paidAmount ?? (p.status === "paid" ? p.amount : 0)
  const balance = p.balance ?? (p.status === "paid" ? 0 : Math.max(p.amount - paid, 0))
  return {
    id: p.id || newId("pay"),
    studentId: p.studentId,
    amount: p.amount,
    paidAmount: paid,
    balance,
    dueDate: p.dueDate || "",
    paidDate: p.paidDate || "",
    status: p.status || "due",
    method: p.method || "square",
    squareInvoiceId: p.squareInvoiceId || "",
    notes: p.notes || "",
    itemId: p.itemId || "",
    itemName: p.itemName || "",
    itemDescription: p.itemDescription || "",
    itemKind: (p.itemKind || "academy") as SquareItemKind,
    source: (p.source as PaymentSource) || (looksLikeSquareId(p.squareInvoiceId, p.notes) ? "square" : "workbook"),
  }
}

function applyManualPayments(
  prev: AppData,
  inputs: Array<Partial<PaymentRecord> & { studentId: string; amount: number }>,
): AppData {
  if (!inputs.length) return prev
  const today = todayISO()
  let payments = prev.payments
  let students = prev.students
  for (const payment of inputs) {
    const student = students.find((s) => s.id === payment.studentId)
    const item = student ? defaultItemForStudent(student) : undefined
    const nextPay = normalizePayment({
      ...payment,
      itemId: payment.itemId || item?.id,
      itemName: payment.itemName || (payment.source === "manual" ? "Desk schedule" : item?.name),
      itemDescription: payment.itemDescription || item?.description,
      itemKind: payment.itemKind || item?.kind,
      source: payment.source || "manual",
    })
    payments = [nextPay, ...payments]
    students = students.map((s) => {
      if (s.id !== nextPay.studentId) return s
      if (nextPay.status === "paid") return s
      const due = nextPay.dueDate.slice(0, 10)
      const sooner = !s.nextPaymentDate || due <= s.nextPaymentDate.slice(0, 10)
      const pastDue = due < today
      const canMarkOverdue =
        pastDue &&
        s.program === "academy" &&
        s.enrollmentStatus !== "collections" &&
        s.enrollmentStatus !== "cancelling" &&
        s.enrollmentStatus !== "pif" &&
        s.paymentPlan !== "pif"
      return {
        ...s,
        nextPaymentDate: sooner ? due : s.nextPaymentDate,
        nextPaymentAmount: sooner ? nextPay.amount : s.nextPaymentAmount,
        enrollmentStatus: canMarkOverdue ? "overdue" : s.enrollmentStatus,
        deskLocks: canMarkOverdue ? { ...s.deskLocks, status: true } : s.deskLocks,
      }
    })
  }
  return { ...prev, payments, students }
}

function looksLikeSquareId(id?: string, notes?: string) {
  const text = notes || ""
  if (text.startsWith("Square subscription") || /^Square invoice \S+ ·/.test(text)) return true
  const value = id || ""
  return Boolean(value) && !value.startsWith("sqinv_") && !value.startsWith("sqsub_")
}

function defaultTrack(s: Partial<Student>): StudentTrack {
  if (s.track) return s.track
  if (s.program === "academy") return "academy"
  return "none"
}

function normalizeStudent(s: Partial<Student> & Pick<Student, "id" | "firstName" | "lastName">): Student {
  const prospect = s.program === "prospect" || s.enrollmentStatus === "contact"
  const student: Student = {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    nickname: s.nickname || "",
    email: s.email || "",
    phone: s.phone || "",
    age: s.age ?? null,
    program: prospect ? "prospect" : s.program || "academy",
    track: prospect ? "none" : defaultTrack(s),
    paymentPlan: s.paymentPlan || "none",
    enrollmentStatus: prospect
      ? "contact"
      : s.enrollmentStatus === "pending" && s.program === "prospect"
        ? "contact"
        : s.enrollmentStatus || "pending",
    startDate: s.startDate || "",
    nextPaymentDate: s.nextPaymentDate || "",
    nextPaymentAmount: s.nextPaymentAmount ?? null,
    installmentsLeft: s.installmentsLeft ?? null,
    overdueSince: (s.overdueSince || "").slice(0, 10),
    notes: s.notes || "",
    contactCategory: (() => {
      const cat = (s.contactCategory || "") as ContactCategory | ""
      if (!prospect) return cat
      if (cat === "inquiry" || cat === "follow-up" || cat === "not-interested") return cat
      const fromLabels = categoryFromLabels(Array.isArray(s.labels) ? s.labels : [])
      if (fromLabels) return fromLabels
      if (cat === "new" || cat === "newsletter") return ""
      return cat
    })(),
    subscriptionStatus: s.subscriptionStatus || "none",
    subscriptionPlan:
      s.subscriptionPlan === "standard" || s.subscriptionPlan === "og" || s.subscriptionPlan === "plus"
        ? s.subscriptionPlan
        : "none",
    manualHighlight:
      s.manualHighlight === "overdue" ||
      s.manualHighlight === "subscriberOverdue" ||
      s.manualHighlight === "collections" ||
      s.manualHighlight === "paused" ||
      s.manualHighlight === "pending" ||
      s.manualHighlight === "finishing" ||
      s.manualHighlight === "pif"
        ? s.manualHighlight
        : "none",
    subscriptionRunDate: (s.subscriptionRunDate || "").slice(0, 10),
    photoshootStatus: s.photoshootStatus || "none",
    photoshootNotes: s.photoshootNotes || "",
    measurements: normalizeMeasurements(s.measurements),
    labels: withoutNewsletterLabels(Array.isArray(s.labels) ? s.labels.filter(Boolean) : []),
    removedLabels: Array.isArray(s.removedLabels) ? s.removedLabels.filter(Boolean) : [],
    deskLocks: {
      status: Boolean(s.deskLocks?.status),
      notes: Boolean(s.deskLocks?.notes),
      installments: Boolean(s.deskLocks?.installments),
      subscription: Boolean(s.deskLocks?.subscription),
      overdueSince: Boolean(s.deskLocks?.overdueSince),
      highlight: Boolean(s.deskLocks?.highlight),
    },
    classTime: s.classTime || "",
    photoUrl: s.photoUrl || "",
    docusignStatus: s.docusignStatus || "none",
    docusignUrl: s.docusignUrl || "",
    docusignEnvelopeId: s.docusignEnvelopeId || "",
    docusignDocument: s.docusignDocument || "",
    docusignSentAt: s.docusignSentAt || "",
    docusignSignedAt: s.docusignSignedAt || "",
    docusignNotes: s.docusignNotes || "",
  }
  return applyDrivePhotos([markPaidInFull(withoutCurrentStudentIfSubscriber(student))])[0]
}

function normalizeData(raw: Partial<AppData> | null | undefined): AppData | null {
  if (!raw?.students?.length) return null
  const students = raw.students.map((s) => normalizeStudent(s))
  const removedPhotoshootIds = [...new Set((raw.removedPhotoshootIds || []).filter(Boolean))]
  const photoshoots = mergePhotoshoots(raw.photoshoots, removedPhotoshootIds)
  const basePlacements =
    raw.photoshootPlacements?.length ? raw.photoshootPlacements : placementsFromStudents(students)
  return withoutDroppedStudents(
    remapStudentIds(
      mergeDuplicateStudents({
        students,
        attendance: raw.attendance ?? [],
        feedback: raw.feedback ?? [],
        payments: (raw.payments ?? []).map((p) => normalizePayment(p)),
        notifications: raw.notifications ?? [],
        groups: (raw.groups ?? []).filter((g) => g.kind === "custom"),
        photoshoots,
        photoshootPlacements: mergeLabelPlacements(basePlacements, students, removedPhotoshootIds),
        calendarEvents: (raw.calendarEvents ?? []).map((event) => normalizeCalendarEvent(event)),
        removedPhotoshootIds,
      }),
    ),
  )
}

const seedData = normalizeData(seed as unknown as Partial<AppData>) ?? (seed as unknown as AppData)

function overlayFrozenPayments(local: AppData): PaymentRecord[] {
  const seedIds = new Set(seedData.payments.map((payment) => payment.id))
  const extras = local.payments.filter((payment) => payment.source === "manual" && !seedIds.has(payment.id))
  return [...seedData.payments, ...extras]
}

function applyNativeEnrollmentFreeze(local: AppData): AppData {
  const merged = mergeEnrollmentStudents(local.students, seedData.students, {
    updateExisting: true,
    forceNotes: true,
    forceStatus: true,
  })
  return withoutDroppedStudents(
    mergeDuplicateStudents({
      ...local,
      students: applyDrivePhotos(merged.students.filter((s) => !isDroppedStudent(s))),
      payments: overlayFrozenPayments(local),
      photoshoots: mergePhotoshoots(local.photoshoots, local.removedPhotoshootIds),
      photoshootPlacements: mergeLabelPlacements(
        local.photoshootPlacements,
        merged.students,
        local.removedPhotoshootIds,
      ),
      calendarEvents: (local.calendarEvents ?? []).map((event) => normalizeCalendarEvent(event)),
      removedPhotoshootIds: local.removedPhotoshootIds || [],
    }),
  )
}

type JotformMeta = {
  fetchedAt: string
  source: string
  message: string
  connected: boolean
  unmatched: JotformCheckIn[]
  formUrl: string
}

const EMPTY_JOTFORM: JotformMeta = {
  fetchedAt: "",
  source: "",
  message: "",
  connected: false,
  unmatched: [],
  formUrl: JOTFORM_ATTENDANCE_URL,
}

const HISTORY_LIMIT = 25

function cloneDesk(data: AppData): AppData {
  return structuredClone(data)
}

type StoreContextValue = AppData & {
  ready: boolean
  lastSavedAt: string
  canUndo: boolean
  canRedo: boolean
  groups: NotifyGroup[]
  customGroups: NotifyGroup[]
  saveDesk: () => boolean
  undoDesk: () => boolean
  redoDesk: () => boolean
  updateStudent: (id: string, patch: Partial<Student>) => void
  changeStudentId: (fromId: string, nextId: string) => ChangeStudentIdResult
  addStudent: (student: Student) => void
  checkIn: (studentId: string, classType: ClassType, notes?: string) => AttendanceRecord
  removeAttendance: (id: string) => void
  addFeedback: (note: Omit<FeedbackNote, "id" | "createdAt"> & { createdAt?: string }) => void
  addPayment: (payment: Omit<PaymentRecord, "id">) => void
  addPayments: (payments: Omit<PaymentRecord, "id">[]) => void
  updatePayment: (id: string, patch: Partial<PaymentRecord>) => void
  ensureSchedulePayment: (student: Student, row: ScheduleRow, patch?: Partial<PaymentRecord>) => string
  removePayment: (id: string) => void
  addNotification: (note: Omit<NotificationRecord, "id" | "sentAt"> & { sentAt?: string }) => void
  addGroup: (name: string, studentIds: string[]) => NotifyGroup
  updateGroup: (id: string, patch: Partial<Pick<NotifyGroup, "name" | "studentIds">>) => void
  deleteGroup: (id: string) => void
  setPhotoshootPlacement: (
    studentId: string,
    shootId: string,
    status: PhotoshootStatus,
  ) => void
  addPhotoshoot: (label?: string, notes?: string) => Photoshoot
  updatePhotoshoot: (id: string, patch: Partial<Pick<Photoshoot, "label" | "notes" | "archived">>) => void
  duplicatePhotoshoot: (id: string) => Photoshoot | null
  deletePhotoshoot: (id: string) => void
  addCalendarEvent: (event: Omit<CalendarEvent, "id"> & { id?: string }) => CalendarEvent
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void
  deleteCalendarEvent: (id: string) => void
  resetRoster: () => void
}

type SyncMeta = {
  fetchedAt: string
  source: string
  message: string
  connected: boolean
}

type SyncContextValue = {
  jotform: JotformMeta
  square: SyncMeta & { matched?: number; skipped?: number }
  enrollment: SyncMeta & { added?: number; updated?: number }
}

const StoreContext = createContext<StoreContextValue | null>(null)
const SyncContext = createContext<SyncContextValue | null>(null)

function cloneSeed(): AppData {
  return structuredClone(seedData)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(cloneSeed)
  const [ready, setReady] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState("")
  const [jotform, setJotform] = useState<JotformMeta>(EMPTY_JOTFORM)
  const [square, setSquare] = useState<SyncContextValue["square"]>({
    fetchedAt: "",
    source: "",
    message: "",
    connected: false,
  })
  const [enrollment, setEnrollment] = useState<SyncContextValue["enrollment"]>({
    fetchedAt: "",
    source: "",
    message: "",
    connected: false,
  })
  const dataRef = useRef(data)
  const pastRef = useRef<AppData[]>([])
  const futureRef = useRef<AppData[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const squareFp = useRef("")
  const enrollFp = useRef("")
  const labelsFp = useRef("")
  const persistTimer = useRef<number>(0)

  useEffect(() => {
    dataRef.current = data
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [data])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const fromCurrent = localStorage.getItem(STORAGE_KEY)
        const fromLegacy = fromCurrent
          ? null
          : LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean)
        const raw = fromCurrent ?? fromLegacy
        let next = cloneSeed()
        if (raw) {
          const parsed = normalizeData(JSON.parse(raw) as AppData)
          if (parsed) {
            next = fromLegacy
              ? {
                  ...parsed,
                  attendance: seedData.attendance,
                  photoshoots: mergePhotoshoots(parsed.photoshoots, parsed.removedPhotoshootIds),
                }
              : parsed
            next = withPhotos(next)
          }
        }
        const frozen = localStorage.getItem(ENROLLMENT_FREEZE_KEY) === ENROLLMENT_FREEZE_ID
        if (!frozen) {
          next = applyNativeEnrollmentFreeze(next)
          localStorage.setItem(ENROLLMENT_FREEZE_KEY, ENROLLMENT_FREEZE_ID)
        }
        if (localStorage.getItem(SUBSCRIBER_ROSTER_KEY) !== SUBSCRIBER_ROSTER_ID) {
          next = {
            ...next,
            students: applyDeskSubscriberRoster(next.students).students,
          }
          localStorage.setItem(SUBSCRIBER_ROSTER_KEY, SUBSCRIBER_ROSTER_ID)
        }
        setData(next)
        const savedAt = localStorage.getItem(SAVED_AT_KEY) || ""
        if (savedAt) setLastSavedAt(savedAt)
      } catch {
        /* keep seed */
      }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const persistNow = useCallback((snapshot?: AppData) => {
    const next = snapshot ?? dataRef.current
    window.clearTimeout(persistTimer.current)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(next)))
      savePhotos(next.students)
      const at = new Date().toISOString()
      localStorage.setItem(SAVED_AT_KEY, at)
      setLastSavedAt(at)
      return true
    } catch {
      return false
    }
  }, [])

  const saveDesk = useCallback(() => {
    window.dispatchEvent(new Event(DESK_SAVE_EVENT))
    return persistNow()
  }, [persistNow])

  useEffect(() => {
    if (!ready) return
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      persistNow(data)
    }, 400)
    return () => window.clearTimeout(persistTimer.current)
  }, [data, ready, persistNow])

  useEffect(() => {
    if (!ready) return
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(dataRef.current)))
        savePhotos(dataRef.current.students)
      } catch {
        /* quota */
      }
    }
    window.addEventListener("beforeunload", flush)
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("beforeunload", flush)
      window.removeEventListener("pagehide", flush)
    }
  }, [ready])

  useEffect(() => {
    if (!ready) return
    const timer = window.setInterval(() => {
      window.dispatchEvent(new Event(DESK_SAVE_EVENT))
      persistNow()
    }, AUTO_SAVE_MS)
    return () => window.clearInterval(timer)
  }, [ready, persistNow])

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    async function pull() {
      try {
        const res = await fetch("/api/jotform", { cache: "no-store" })
        const payload = (await res.json()) as {
          checkIns?: JotformCheckIn[]
          fetchedAt?: string
          source?: string
          message?: string
          connected?: boolean
          formUrl?: string
        }
        if (cancelled) return
        const checkIns = payload.checkIns ?? []
        const matched = matchJotformCheckIns(checkIns, dataRef.current.students)
        setJotform((prev) => {
          const next = {
            fetchedAt: payload.fetchedAt || new Date().toISOString(),
            source: payload.source || "",
            message: payload.message || "",
            connected: Boolean(payload.connected),
            unmatched: matched.unmatched,
            formUrl: payload.formUrl || JOTFORM_ATTENDANCE_URL,
          }
          if (
            prev.source === next.source &&
            prev.connected === next.connected &&
            prev.message === next.message &&
            prev.formUrl === next.formUrl &&
            prev.unmatched.map((row) => row.id).join("|") === next.unmatched.map((row) => row.id).join("|")
          ) {
            return prev
          }
          return next
        })
        setData((prev) => {
          const attendance =
            payload.source === "sheet"
              ? replaceAttendanceFromTracker(matched.records)
              : mergeAttendance(prev.attendance, matched.records)
          if (attendanceKey(attendance) === attendanceKey(prev.attendance)) return prev
          return { ...prev, attendance }
        })
      } catch {
        /* keep last pull */
      }
    }

    pull()
    const timer = window.setInterval(pull, JOTFORM_MS)
    const onFocus = () => pull()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [ready])

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    async function pullBilling() {
      try {
        const [enrollRes, squareRes] = await Promise.all([
          fetch("/api/enrollment", { cache: "no-store" }),
          fetch("/api/square", { cache: "no-store" }),
        ])
        const enrollPayload = (await enrollRes.json()) as {
          students?: Student[]
          source?: string
          message?: string
          connected?: boolean
          fetchedAt?: string
          frozen?: boolean
          contactLabels?: ContactLabelRow[]
        }
        const squarePayload = (await squareRes.json()) as {
          invoices?: SquareInvoiceRow[]
          source?: string
          message?: string
          connected?: boolean
          syncedAt?: string
        }
        if (cancelled) return

        const frozen = Boolean(enrollPayload.frozen) || enrollPayload.source === "workbook"
        const invoices = squarePayload.invoices ?? []
        const fp = squareFingerprint(invoices)
        const invoicesChanged = Boolean(fp) && fp !== squareFp.current
        if (fp) squareFp.current = fp

        const preview = applySquareInvoices(dataRef.current.students, dataRef.current.payments, invoices)
        setEnrollment({
          fetchedAt: enrollPayload.fetchedAt || new Date().toISOString(),
          source: frozen ? "workbook" : enrollPayload.source || "workbook",
          message:
            enrollPayload.message ||
            "Enrollment is native on this desk. The Google Sheet is no longer used.",
          connected: true,
        })
        setSquare({
          fetchedAt: squarePayload.syncedAt || new Date().toISOString(),
          source: squarePayload.source || "",
          message: squarePayload.message || "",
          connected: Boolean(squarePayload.connected),
          matched: preview.matched,
          skipped: preview.skipped.length,
        })

        if (frozen) {
          if (!invoicesChanged) return
          setData((prev) => {
            const applied = applySquareInvoices(prev.students, prev.payments, invoices)
            const next = mergeDuplicateStudents({
              ...prev,
              students: applied.students,
              payments: applied.payments,
            })
            dataRef.current = next
            return next
          })
          return
        }

        const workbook = (enrollPayload.students ?? []).map((s) =>
          normalizeStudent(s as Student & Pick<Student, "id" | "firstName" | "lastName">),
        )
        const labelRows = enrollPayload.contactLabels ?? []
        const nextEnrollFp = enrollmentFingerprint(workbook)
        const nextLabelsFp = contactLabelsFingerprint(labelRows)
        const enrollChanged = nextEnrollFp !== enrollFp.current
        const labelsChanged = nextLabelsFp !== labelsFp.current
        if (nextEnrollFp) enrollFp.current = nextEnrollFp
        if (nextLabelsFp) labelsFp.current = nextLabelsFp
        const merged = mergeEnrollmentStudents(dataRef.current.students, workbook, {
          updateExisting: true,
        })
        const labeled = applyContactLabels(merged.students, labelRows)
        setEnrollment({
          fetchedAt: enrollPayload.fetchedAt || new Date().toISOString(),
          source: enrollPayload.source || "workbook",
          message: enrollPayload.message || "",
          connected: Boolean(enrollPayload.connected),
          added: merged.added + labeled.added,
          updated: merged.updated + labeled.updated,
        })

        if (
          !merged.added &&
          !merged.updated &&
          !labeled.updated &&
          !labeled.added &&
          !invoicesChanged &&
          !enrollChanged &&
          !labelsChanged
        )
          return

        setData((prev) => {
          const roster = applyDrivePhotos(
            applyContactLabels(
              mergeEnrollmentStudents(prev.students, workbook, { updateExisting: true }).students,
              labelRows,
            ).students,
          )
          const applied = applySquareInvoices(roster, prev.payments, invoices)
          const next = mergeDuplicateStudents({
            ...prev,
            students: applied.students,
            payments: applied.payments,
            photoshoots: mergePhotoshoots(prev.photoshoots, prev.removedPhotoshootIds),
            photoshootPlacements: mergeLabelPlacements(
              prev.photoshootPlacements,
              applied.students,
              prev.removedPhotoshootIds,
            ),
          })
          dataRef.current = next
          return next
        })
      } catch {
        /* keep last overlay */
      }
    }

    pullBilling()
    const timer = window.setInterval(pullBilling, SQUARE_MS)
    const onFocus = () => pullBilling()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [ready])

  const mutate = useCallback((fn: (prev: AppData) => AppData, record = true) => {
    setData((prev) => {
      const next = fn(prev)
      if (next === prev) return prev
      if (record) {
        pastRef.current = [...pastRef.current, cloneDesk(prev)].slice(-HISTORY_LIMIT)
        futureRef.current = []
      }
      dataRef.current = next
      return next
    })
  }, [])

  const undoDesk = useCallback(() => {
    const past = pastRef.current
    if (!past.length) return false
    const prev = past[past.length - 1]
    pastRef.current = past.slice(0, -1)
    futureRef.current = [cloneDesk(dataRef.current), ...futureRef.current].slice(0, HISTORY_LIMIT)
    dataRef.current = prev
    setData(prev)
    return true
  }, [])

  const redoDesk = useCallback(() => {
    const future = futureRef.current
    if (!future.length) return false
    const next = future[0]
    futureRef.current = future.slice(1)
    pastRef.current = [...pastRef.current, cloneDesk(dataRef.current)].slice(-HISTORY_LIMIT)
    dataRef.current = next
    setData(next)
    return true
  }, [])

  const customGroups = useMemo(() => data.groups ?? [], [data.groups])
  const groups = useMemo(
    () => allNotifyGroups(data.students, data.payments, customGroups),
    [data.students, data.payments, customGroups],
  )

  const value = useMemo<StoreContextValue>(() => {
    return {
      ...data,
      groups,
      customGroups,
      ready,
      lastSavedAt,
      canUndo,
      canRedo,
      saveDesk,
      undoDesk,
      redoDesk,
      updateStudent: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          students: prev.students.map((s) => {
            if (s.id !== id) return s
            const next: Student = { ...s, ...patch }
            next.deskLocks = { ...s.deskLocks, ...patch.deskLocks }
            if (patch.enrollmentStatus && patch.enrollmentStatus !== s.enrollmentStatus) {
              next.deskLocks = { ...next.deskLocks, status: true }
            }
            if (patch.notes !== undefined && patch.deskLocks?.notes !== false) {
              next.deskLocks = { ...next.deskLocks, notes: true }
            }
            if (patch.installmentsLeft !== undefined && patch.deskLocks?.installments !== false) {
              next.deskLocks = { ...next.deskLocks, installments: true }
            }
            if (patch.overdueSince !== undefined && patch.deskLocks?.overdueSince !== false) {
              next.deskLocks = { ...next.deskLocks, overdueSince: Boolean(next.overdueSince) }
            }
            if (patch.labels) {
              const labels = [...new Set(patch.labels.map((label) => label.trim()).filter(Boolean))]
              const removed = new Set(s.removedLabels || [])
              for (const old of s.labels || []) {
                if (!labels.includes(old)) removed.add(old)
              }
              for (const label of labels) removed.delete(label)
              next.labels = labels
              next.removedLabels = [...removed]
            }
            return normalizeStudent(next)
          }),
        })),
      changeStudentId: (fromId, rawNext) => {
        const nextId = parseStudentId(rawNext)
        if (!nextId) return { ok: false, error: "Student ID must be numbers only — same as Square." }
        const current = dataRef.current
        const student = current.students.find((s) => s.id === fromId)
        if (!student) return { ok: false, error: "Talent not found." }
        if (student.id === nextId || displayStudentId(student.id) === nextId) {
          return { ok: true, id: student.id }
        }
        const taken = current.students.some(
          (s) => s.id !== fromId && (s.id === nextId || displayStudentId(s.id) === nextId),
        )
        if (taken) return { ok: false, error: "That student ID is already on the roster." }
        mutate((prev) => reassignStudentId(prev, fromId, nextId))
        return { ok: true, id: nextId }
      },
      addStudent: (student) =>
        mutate((prev) => ({
          ...prev,
          students: [
            normalizeStudent({
              ...student,
              deskLocks: {
                ...student.deskLocks,
                notes: Boolean(student.deskLocks?.notes) || Boolean(student.notes?.trim()),
              },
            }),
            ...prev.students,
          ],
        })),
      checkIn: (studentId, classType, notes = "") => {
        const record: AttendanceRecord = {
          id: newId("att"),
          studentId,
          checkedInAt: new Date().toISOString(),
          classType,
          notes,
        }
        mutate((prev) => ({ ...prev, attendance: [record, ...prev.attendance] }))
        const student = data.students.find((s) => s.id === studentId)
        if (student) {
          void fetch("/api/jotform/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: student.firstName,
              lastName: student.lastName,
              phone: student.phone,
              classType,
            }),
          }).catch(() => {
            /* desk check-in already saved */
          })
        }
        return record
      },
      removeAttendance: (id) =>
        mutate((prev) => ({
          ...prev,
          attendance: prev.attendance.filter((a) => a.id !== id),
        })),
      addFeedback: (note) =>
        mutate((prev) => ({
          ...prev,
          feedback: [
            {
              id: newId("fb"),
              createdAt: note.createdAt || new Date().toISOString(),
              studentId: note.studentId,
              author: note.author,
              classType: note.classType,
              body: note.body,
            },
            ...prev.feedback,
          ],
        })),
      addPayment: (payment) => mutate((prev) => applyManualPayments(prev, [payment])),
      addPayments: (rows) => mutate((prev) => applyManualPayments(prev, rows)),
      updatePayment: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          payments: prev.payments.map((p) => (p.id === id ? normalizePayment({ ...p, ...patch }) : p)),
        })),
      ensureSchedulePayment: (student, row, patch) => {
        const existing = row.paymentId
          ? dataRef.current.payments.find((payment) => payment.id === row.paymentId)
          : undefined
        if (existing) {
          if (patch) {
            mutate((prev) => ({
              ...prev,
              payments: prev.payments.map((payment) =>
                payment.id === existing.id ? normalizePayment({ ...payment, ...patch }) : payment,
              ),
            }))
          }
          return existing.id
        }
        const id = newId("pay")
        mutate((prev) =>
          applyManualPayments(prev, [{ ...paymentFromScheduleRow(student, row), ...patch, id, source: "manual" }]),
        )
        return id
      },
      removePayment: (id) =>
        mutate((prev) => ({
          ...prev,
          payments: prev.payments.filter((p) => p.id !== id),
        })),
      addNotification: (note) =>
        mutate((prev) => ({
          ...prev,
          notifications: [
            {
              id: newId("nt"),
              sentAt: note.sentAt || new Date().toISOString(),
              studentIds: note.studentIds,
              channel: note.channel,
              subject: note.subject,
              body: note.body,
              status: note.status,
            },
            ...prev.notifications,
          ],
        })),
      addGroup: (name, studentIds) => {
        const group: NotifyGroup = {
          id: newId("grp"),
          name: name.trim(),
          kind: "custom",
          studentIds: [...new Set(studentIds)],
          createdAt: new Date().toISOString(),
        }
        mutate((prev) => ({ ...prev, groups: [group, ...(prev.groups ?? [])] }))
        return group
      },
      updateGroup: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          groups: (prev.groups ?? []).map((g) => (g.id === id && g.kind === "custom" ? { ...g, ...patch } : g)),
        })),
      deleteGroup: (id) =>
        mutate((prev) => ({
          ...prev,
          groups: (prev.groups ?? []).filter((g) => g.id !== id),
        })),
      setPhotoshootPlacement: (studentId, shootId, status) =>
        mutate((prev) => {
          const without = prev.photoshootPlacements.filter(
            (row) => !(row.studentId === studentId && row.shootId === shootId),
          )
          const nextPlacements =
            status === "none" ? without : [...without, newPlacement(shootId, studentId, status)]
          const onOpen = nextPlacements.find((row) => {
            if (row.studentId !== studentId) return false
            const shoot = prev.photoshoots.find((s) => s.id === row.shootId)
            return shoot && !shoot.archived
          })
          return {
            ...prev,
            photoshootPlacements: nextPlacements,
            students: prev.students.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    photoshootStatus: onOpen?.status ?? (status === "none" ? "none" : status),
                  }
                : s,
            ),
          }
        }),
      addPhotoshoot: (label, notes) => {
        const shoot = createPhotoshoot(data.photoshoots, label || "", notes || "")
        mutate((prev) => {
          if (prev.photoshoots.some((s) => s.id === shoot.id)) return prev
          return { ...prev, photoshoots: [...prev.photoshoots, shoot] }
        })
        return shoot
      },
      updatePhotoshoot: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          photoshoots: prev.photoshoots.map((s) =>
            s.id === id
              ? {
                  ...s,
                  label: patch.label !== undefined ? patch.label.trim() || s.label : s.label,
                  notes: patch.notes !== undefined ? patch.notes : s.notes,
                  archived: patch.archived !== undefined ? patch.archived : s.archived,
                }
              : s,
          ),
        })),
      duplicatePhotoshoot: (id) => {
        const source = data.photoshoots.find((s) => s.id === id)
        if (!source) return null
        const copy = buildPhotoshootCopy(data.photoshoots, source)
        mutate((prev) => ({
          ...prev,
          photoshoots: [...prev.photoshoots, copy],
          photoshootPlacements: [
            ...prev.photoshootPlacements,
            ...prev.photoshootPlacements
              .filter((row) => row.shootId === id)
              .map((row) => newPlacement(copy.id, row.studentId, row.status)),
          ],
        }))
        return copy
      },
      deletePhotoshoot: (id) =>
        mutate((prev) => ({
          ...prev,
          photoshoots: prev.photoshoots.filter((s) => s.id !== id),
          photoshootPlacements: prev.photoshootPlacements.filter((row) => row.shootId !== id),
          removedPhotoshootIds: [...new Set([...(prev.removedPhotoshootIds || []), id])],
        })),
      addCalendarEvent: (event) => {
        const next = normalizeCalendarEvent(event)
        mutate((prev) => ({ ...prev, calendarEvents: [...(prev.calendarEvents || []), next] }))
        return next
      },
      updateCalendarEvent: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          calendarEvents: (prev.calendarEvents || []).map((event) =>
            event.id === id ? normalizeCalendarEvent({ ...event, ...patch, id }) : event,
          ),
        })),
      deleteCalendarEvent: (id) =>
        mutate((prev) => ({
          ...prev,
          calendarEvents: (prev.calendarEvents || []).filter((event) => event.id !== id),
        })),
      resetRoster: () => {
        const seeded = cloneSeed()
        const next = {
          ...seeded,
          students: applyDeskSubscriberRoster(seeded.students).students,
        }
        localStorage.setItem(SUBSCRIBER_ROSTER_KEY, SUBSCRIBER_ROSTER_ID)
        pastRef.current = []
        futureRef.current = []
        dataRef.current = next
        setData(next)
        setCanUndo(false)
        setCanRedo(false)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(PHOTOS_KEY)
        localStorage.removeItem(SAVED_AT_KEY)
        localStorage.setItem(ENROLLMENT_FREEZE_KEY, ENROLLMENT_FREEZE_ID)
        setLastSavedAt("")
      },
    }
  }, [data, mutate, ready, groups, customGroups, lastSavedAt, saveDesk, canUndo, canRedo, undoDesk, redoDesk])

  const syncValue = useMemo<SyncContextValue>(
    () => ({ jotform, square, enrollment }),
    [jotform, square, enrollment],
  )

  return (
    <StoreContext.Provider value={value}>
      <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error("useSync must be used within StoreProvider")
  return ctx
}

export function useStudent(id: string | undefined) {
  const { students } = useStore()
  return students.find((s) => s.id === id)
}

export function attendanceFor(data: Pick<AppData, "attendance">, studentId: string) {
  return data.attendance.filter((a) => a.studentId === studentId)
}

export function countsFor(records: AttendanceRecord[]) {
  return {
    modeling: records.filter((r) => r.classType === "modeling").length,
    acting: records.filter((r) => r.classType === "acting").length,
    subscriber: records.filter((r) => r.classType === "subscriber").length,
    total: records.length,
  }
}
