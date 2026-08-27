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
  PaymentRecord,
  Student,
} from "./types"
import { newId } from "./format"

const STORAGE_KEY = "viya-academy-store-v1"

const seedData = seed as AppData

type StoreContextValue = AppData & {
  ready: boolean
  updateStudent: (id: string, patch: Partial<Student>) => void
  addStudent: (student: Student) => void
  checkIn: (studentId: string, classType: ClassType, notes?: string) => AttendanceRecord
  removeAttendance: (id: string) => void
  addFeedback: (note: Omit<FeedbackNote, "id" | "createdAt"> & { createdAt?: string }) => void
  addPayment: (payment: Omit<PaymentRecord, "id">) => void
  updatePayment: (id: string, patch: Partial<PaymentRecord>) => void
  addNotification: (note: Omit<NotificationRecord, "id" | "sentAt"> & { sentAt?: string }) => void
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
          const parsed = JSON.parse(raw) as AppData
          if (parsed?.students?.length) setData(parsed)
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

  const value = useMemo<StoreContextValue>(() => {
    return {
      ...data,
      ready,
      updateStudent: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          students: prev.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      addStudent: (student) =>
        mutate((prev) => ({ ...prev, students: [student, ...prev.students] })),
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
        mutate((prev) => ({
          ...prev,
          payments: [{ ...payment, id: newId("pay") }, ...prev.payments],
        })),
      updatePayment: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          payments: prev.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)),
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
      resetRoster: () => {
        const next = cloneSeed()
        setData(next)
        localStorage.removeItem(STORAGE_KEY)
      },
    }
  }, [data, mutate, ready])

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
