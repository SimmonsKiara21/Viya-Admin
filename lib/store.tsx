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
  Photoshoot,
  PhotoshootStatus,
  SquareItemKind,
  Student,
  StudentTrack,
} from "./types"
import { newId } from "./format"
import { allNotifyGroups } from "./groups"
import { defaultItemForStudent } from "./square"
import { matchJotformCheckIns, mergeAttendance, type JotformCheckIn } from "./jotform"
import { JOTFORM_ATTENDANCE_URL } from "./constants"
import { mergePhotoshoots, newPlacement, nextShootId, placementsFromStudents } from "./photoshoots"
import { applySquareInvoices, squareFingerprint, type SquareInvoiceRow } from "./square-sync"
import { enrollmentFingerprint, mergeEnrollmentStudents } from "./enrollment-sync"
import { applyDrivePhotos, drivePhotoUrl } from "./photos-overlay"

const STORAGE_KEY = "viya-academy-store-v6"
const LEGACY_KEYS = ["viya-academy-store-v5", "viya-academy-store-v4"]
const PHOTOS_KEY = "viya-academy-photos-v1"
const JOTFORM_MS = 60_000
const SQUARE_MS = 60_000

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
  return {
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
    notes: s.notes || "",
    contactCategory: (s.contactCategory || (prospect ? "photoshoot" : "")) as ContactCategory | "",
    subscriptionStatus: s.subscriptionStatus || "none",
    photoshootStatus: s.photoshootStatus || "none",
    photoshootNotes: s.photoshootNotes || "",
    classTime: s.classTime || "",
    photoUrl: s.photoUrl || drivePhotoUrl(s.id),
    docusignStatus: s.docusignStatus || "none",
    docusignUrl: s.docusignUrl || "",
    docusignEnvelopeId: s.docusignEnvelopeId || "",
    docusignDocument: s.docusignDocument || "",
    docusignSentAt: s.docusignSentAt || "",
    docusignSignedAt: s.docusignSignedAt || "",
    docusignNotes: s.docusignNotes || "",
  }
}

function normalizeData(raw: Partial<AppData> | null | undefined): AppData | null {
  if (!raw?.students?.length) return null
  const students = raw.students.map((s) => normalizeStudent(s))
  const photoshoots = mergePhotoshoots(raw.photoshoots)
  const photoshootPlacements =
    raw.photoshootPlacements?.length ? raw.photoshootPlacements : placementsFromStudents(students)
  return {
    students,
    attendance: raw.attendance ?? [],
    feedback: raw.feedback ?? [],
    payments: (raw.payments ?? []).map((p) => normalizePayment(p)),
    notifications: raw.notifications ?? [],
    groups: (raw.groups ?? []).filter((g) => g.kind === "custom"),
    photoshoots,
    photoshootPlacements,
  }
}

const seedData = normalizeData(seed as unknown as Partial<AppData>) ?? (seed as unknown as AppData)

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

type StoreContextValue = AppData & {
  ready: boolean
  groups: NotifyGroup[]
  customGroups: NotifyGroup[]
  updateStudent: (id: string, patch: Partial<Student>) => void
  addStudent: (student: Student) => void
  checkIn: (studentId: string, classType: ClassType, notes?: string) => AttendanceRecord
  removeAttendance: (id: string) => void
  addFeedback: (note: Omit<FeedbackNote, "id" | "createdAt"> & { createdAt?: string }) => void
  addPayment: (payment: Omit<PaymentRecord, "id">) => void
  updatePayment: (id: string, patch: Partial<PaymentRecord>) => void
  addNotification: (note: Omit<NotificationRecord, "id" | "sentAt"> & { sentAt?: string }) => void
  addGroup: (name: string, studentIds: string[]) => NotifyGroup
  updateGroup: (id: string, patch: Partial<Pick<NotifyGroup, "name" | "studentIds">>) => void
  deleteGroup: (id: string) => void
  setPhotoshootPlacement: (
    studentId: string,
    shootId: string,
    status: PhotoshootStatus,
  ) => void
  addPhotoshoot: () => Photoshoot
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
  const squareFp = useRef("")
  const enrollFp = useRef("")
  const persistTimer = useRef<number>(0)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const fromCurrent = localStorage.getItem(STORAGE_KEY)
        const fromLegacy = fromCurrent
          ? null
          : LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean)
        const raw = fromCurrent ?? fromLegacy
        if (raw) {
          const parsed = normalizeData(JSON.parse(raw) as AppData)
          if (parsed) {
            const base = fromLegacy
              ? { ...parsed, attendance: seedData.attendance, photoshoots: mergePhotoshoots(parsed.photoshoots) }
              : parsed
            setData(withPhotos(base))
          }
        }
      } catch {
        /* keep seed */
      }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!ready) return
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(data)))
        savePhotos(data.students)
      } catch {
        /* quota */
      }
    }, 400)
    return () => window.clearTimeout(persistTimer.current)
  }, [data, ready])

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
          const attendance = mergeAttendance(prev.attendance, matched.records)
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
        }
        const squarePayload = (await squareRes.json()) as {
          invoices?: SquareInvoiceRow[]
          source?: string
          message?: string
          connected?: boolean
          syncedAt?: string
        }
        if (cancelled) return

        const workbook = (enrollPayload.students ?? []).map((s) =>
          normalizeStudent(s as Student & Pick<Student, "id" | "firstName" | "lastName">),
        )
        const liveSheet = enrollPayload.source !== "workbook"
        const nextEnrollFp = enrollmentFingerprint(workbook)
        const enrollChanged = nextEnrollFp !== enrollFp.current
        if (nextEnrollFp) enrollFp.current = nextEnrollFp
        const merged = mergeEnrollmentStudents(dataRef.current.students, workbook, {
          updateExisting: liveSheet,
        })
        setEnrollment({
          fetchedAt: enrollPayload.fetchedAt || new Date().toISOString(),
          source: enrollPayload.source || "workbook",
          message: enrollPayload.message || "",
          connected: Boolean(enrollPayload.connected),
          added: merged.added,
          updated: merged.updated,
        })

        const invoices = squarePayload.invoices ?? []
        const fp = squareFingerprint(invoices)
        const invoicesChanged = Boolean(fp) && fp !== squareFp.current
        if (fp) squareFp.current = fp

        const preview = applySquareInvoices(
          mergeEnrollmentStudents(dataRef.current.students, workbook, { updateExisting: liveSheet }).students,
          dataRef.current.payments,
          invoices,
        )
        setSquare({
          fetchedAt: squarePayload.syncedAt || new Date().toISOString(),
          source: squarePayload.source || "",
          message: squarePayload.message || "",
          connected: Boolean(squarePayload.connected),
          matched: preview.matched,
          skipped: preview.skipped.length,
        })

        if (!merged.added && !merged.updated && !invoicesChanged && !enrollChanged) return

        setData((prev) => {
          const roster = applyDrivePhotos(
            mergeEnrollmentStudents(prev.students, workbook, { updateExisting: liveSheet }).students,
          )
          const applied = applySquareInvoices(roster, prev.payments, invoices)
          return { ...prev, students: applied.students, payments: applied.payments }
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

  const mutate = useCallback((fn: (prev: AppData) => AppData) => {
    setData((prev) => fn(prev))
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
      updateStudent: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          students: prev.students.map((s) => (s.id === id ? normalizeStudent({ ...s, ...patch }) : s)),
        })),
      addStudent: (student) =>
        mutate((prev) => ({ ...prev, students: [normalizeStudent(student), ...prev.students] })),
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
      addPayment: (payment) =>
        mutate((prev) => {
          const student = prev.students.find((s) => s.id === payment.studentId)
          const item = student ? defaultItemForStudent(student) : undefined
          return {
            ...prev,
            payments: [
              normalizePayment({
                ...payment,
                itemId: payment.itemId || item?.id,
                itemName: payment.itemName || item?.name,
                itemDescription: payment.itemDescription || item?.description,
                itemKind: payment.itemKind || item?.kind,
              }),
              ...prev.payments,
            ],
          }
        }),
      updatePayment: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          payments: prev.payments.map((p) => (p.id === id ? normalizePayment({ ...p, ...patch }) : p)),
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
      addPhotoshoot: () => {
        const next = nextShootId(data.photoshoots)
        const shoot: Photoshoot = { ...next, archived: false }
        mutate((prev) => {
          if (prev.photoshoots.some((s) => s.id === shoot.id)) return prev
          return { ...prev, photoshoots: [...prev.photoshoots, shoot] }
        })
        return shoot
      },
      resetRoster: () => {
        const next = cloneSeed()
        setData(next)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(PHOTOS_KEY)
      },
    }
  }, [data, mutate, ready, groups, customGroups])

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
