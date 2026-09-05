export type EnrollmentStatus =
  | "current"
  | "pending"
  | "declined"
  | "pif"
  | "overdue"
  | "paused"
  | "collections"
  | "contact"

export type Program = "academy" | "subscriber" | "prospect"
export type StudentTrack = "academy" | "modeling" | "acting" | "none"
export type ContactCategory = "new" | "photoshoot" | "inquiry" | "follow-up" | "not-interested"
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
export type PaymentSource = "square" | "workbook"
export type SquareItemKind = "subscriber" | "academy" | "event" | "fee"
export type DocusignStatus = "none" | "sent" | "viewed" | "signed" | "declined" | "expired"
export type NotifyChannel = "sms" | "email"
export type NotifyStatus = "sent" | "queued" | "failed" | "demo"
export type NotifyGroupKind = "system" | "custom"
export type SystemGroupKey = "current" | "overdue" | "subscriberOverdue" | "subscribers"

export interface Student {
  id: string
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  age: number | null
  program: Program
  track: StudentTrack
  paymentPlan: PaymentPlan
  enrollmentStatus: EnrollmentStatus
  startDate: string
  nextPaymentDate: string
  nextPaymentAmount: number | null
  installmentsLeft: number | null
  notes: string
  contactCategory: ContactCategory | ""
  subscriptionStatus: SubscriptionStatus
  photoshootStatus: PhotoshootStatus
  photoshootNotes: string
  /** Google Contacts labels (Current Student, Active Subscribers, photoshoot lists). */
  labels: string[]
  classTime: string
  photoUrl: string
  docusignStatus: DocusignStatus
  docusignUrl: string
  docusignEnvelopeId: string
  docusignDocument: string
  docusignSentAt: string
  docusignSignedAt: string
  docusignNotes: string
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

export interface SquareCatalogItem {
  id: string
  name: string
  price: number | null
  kind: SquareItemKind
  description: string
}

export interface PaymentRecord {
  id: string
  studentId: string
  amount: number
  paidAmount: number
  balance: number
  dueDate: string
  paidDate: string
  status: PaymentStatus
  method: "square" | "cash" | "other"
  squareInvoiceId: string
  notes: string
  itemId: string
  itemName: string
  itemDescription: string
  itemKind: SquareItemKind
  source: PaymentSource
}

export interface NotifyGroup {
  id: string
  name: string
  kind: NotifyGroupKind
  systemKey?: SystemGroupKey
  studentIds: string[]
  createdAt: string
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

export interface Photoshoot {
  id: string
  label: string
  archived: boolean
}

export interface PhotoshootPlacement {
  id: string
  shootId: string
  studentId: string
  status: Exclude<PhotoshootStatus, "none">
}

export interface AppData {
  students: Student[]
  attendance: AttendanceRecord[]
  feedback: FeedbackNote[]
  payments: PaymentRecord[]
  notifications: NotificationRecord[]
  groups: NotifyGroup[]
  photoshoots: Photoshoot[]
  photoshootPlacements: PhotoshootPlacement[]
}
