export type EnrollmentStatus =
  | "current"
  | "pending"
  | "declined"
  | "pif"
  | "overdue"
  | "paused"
  | "collections"

export type Program = "academy" | "subscriber" | "prospect"
export type PaymentPlan = "pp" | "pif" | "subscription" | "none"
export type ClassType = "modeling" | "acting" | "subscriber"
export type PhotoshootStatus =
  | "none"
  | "scheduled"
  | "headshots"
  | "full"
  | "refresh"
  | "received"
export type SubscriptionStatus = "none" | "active" | "interested" | "paused" | "cancelled"
export type PaymentStatus = "paid" | "due" | "overdue" | "declined" | "scheduled"
export type NotifyChannel = "sms" | "email"
export type NotifyStatus = "sent" | "queued" | "failed" | "demo"

export interface Student {
  id: string
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  age: number | null
  program: Program
  paymentPlan: PaymentPlan
  enrollmentStatus: EnrollmentStatus
  startDate: string
  nextPaymentDate: string
  nextPaymentAmount: number | null
  notes: string
  subscriptionStatus: SubscriptionStatus
  photoshootStatus: PhotoshootStatus
  photoshootNotes: string
  classTime: string
  photoUrl: string
}

export interface AttendanceRecord {
  id: string
  studentId: string
  checkedInAt: string
  classType: ClassType
  notes: string
}

export interface FeedbackNote {
  id: string
  studentId: string
  createdAt: string
  author: string
  classType?: ClassType
  body: string
}

export interface PaymentRecord {
  id: string
  studentId: string
  amount: number
  dueDate: string
  paidDate: string
  status: PaymentStatus
  method: "square" | "cash" | "other"
  squareInvoiceId: string
  notes: string
}

export interface NotificationRecord {
  id: string
  studentIds: string[]
  channel: NotifyChannel
  subject: string
  body: string
  sentAt: string
  status: NotifyStatus
}

export interface AppData {
  students: Student[]
  attendance: AttendanceRecord[]
  feedback: FeedbackNote[]
  payments: PaymentRecord[]
  notifications: NotificationRecord[]
}
