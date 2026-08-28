"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import seed from "@/data/seed.json"
import type {
  AppData,
  AttendanceRecord,
  ClassType,
  FeedbackNote,
  NotificationRecord,
  NotifyGroup,
  PaymentRecord,
  PaymentSource,
  SquareItemKind,
  Student,
} from "./types"
import { newId } from "./format"
import { allNotifyGroups } from "./groups"
import { defaultItemForStudent } from "./square"

const STORAGE_KEY = "viya-academy-store-v4"

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

function normalizeStudent(s: Partial<Student> & Pick<Student, "id" | "firstName" | "lastName">): Student {
  return {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    nickname: s.nickname || "",
    email: s.email || "",
    phone: s.phone || "",
    age: s.age ?? null,
    program: s.program || "academy",
    paymentPlan: s.paymentPlan || "none",
    enrollmentStatus: s.enrollmentStatus || "pending",
    startDate: s.startDate || "",
    nextPaymentDate: s.nextPaymentDate || "",
    nextPaymentAmount: s.nextPaymentAmount ?? null,
    notes: s.notes || "",
    subscriptionStatus: s.subscriptionStatus || "none",
    photoshootStatus: s.photoshootStatus || "none",
    photoshootNotes: s.photoshootNotes || "",
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
}

function normalizeData(raw: Partial<AppData> | null | undefined): AppData | null {
  if (!raw?.students?.length) return null
  return {
    students: raw.students.map((s) => normalizeStudent(s)),
    attendance: raw.attendance ?? [],
    feedback: raw.feedback ?? [],
    payments: (raw.payments ?? []).map((p) => normalizePayment(p)),
    notifications: raw.notifications ?? [],
    groups: (raw.groups ?? []).filter((g) => g.kind === "custom"),
  }
}

const seedData = normalizeData(seed as unknown as Partial<AppData>) ?? (seed as unknown as AppData)

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
  resetRoster: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

function cloneSeed(): AppData {
  return structuredClone(seedData)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(cloneSeed)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = normalizeData(JSON.parse(raw) as AppData)
          if (parsed) setData(parsed)
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* quota — photos can be large */
    }
  }, [data, ready])

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
      resetRoster: () => {
        const next = cloneSeed()
        setData(next)
        localStorage.removeItem(STORAGE_KEY)
      },
    }
  }, [data, mutate, ready, groups, customGroups])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
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
