import type {
  ClassType,
  EnrollmentStatus,
  PaymentPlan,
  PaymentStatus,
  PhotoshootStatus,
  Program,
  SubscriptionStatus,
} from "./types"

export const ACADEMY_NAME = "Viya Academy"
export const ACADEMY_PHONE = "(602) 342-2902"
export const ACADEMY_EMAIL = "viyatalent@gmail.com"
export const ACADEMY_ADDRESS = "2141 East Camelback Rd #222, Phoenix, AZ 85016"
export const PUBLIC_SITE = "https://www.viyatalent.com"

export const ENROLLMENT_LABELS: Record<EnrollmentStatus, string> = {
  current: "Current",
  pending: "Pending",
  declined: "Declined",
  pif: "PIF / Paid in Full",
  overdue: "Overdue",
  paused: "Paused",
  collections: "Collections",
}

export const PROGRAM_LABELS: Record<Program, string> = {
  academy: "Academy",
  subscriber: "Subscriber",
  prospect: "Prospect",
}

export const PLAN_LABELS: Record<PaymentPlan, string> = {
  pp: "Payment Plan",
  pif: "Paid in Full",
  subscription: "Subscription",
  none: "None",
}

export const CLASS_LABELS: Record<ClassType, string> = {
  modeling: "Modeling",
  acting: "Acting",
  subscriber: "Subscriber",
}

export const PHOTO_LABELS: Record<PhotoshootStatus, string> = {
  none: "Not scheduled",
  scheduled: "Scheduled",
  headshots: "Headshots",
  full: "Full photoshoot",
  refresh: "Refresh",
  received: "Received",
}

export const SUB_LABELS: Record<SubscriptionStatus, string> = {
  none: "None",
  active: "Active",
  interested: "Interested",
  paused: "Paused",
  cancelled: "Cancelled",
}

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  declined: "Declined",
  scheduled: "Scheduled",
}

export const MESSAGE_TEMPLATES = [
  {
    id: "pay-sms",
    channel: "sms" as const,
    name: "Payment reminder (text)",
    subject: "",
    body: `Hi {{firstName}}, this is Viya Academy. A Square payment of {{amount}} is due {{due}}. Reply here or call ${ACADEMY_PHONE} if you need help updating your card.`,
  },
  {
    id: "pay-email",
    channel: "email" as const,
    name: "Payment reminder (email)",
    subject: "Viya Academy — payment reminder",
    body: `Hi {{firstName}},\n\nThis is a reminder from Viya Academy + Agency that a Square invoice of {{amount}} is due {{due}}.\n\nYou can pay from the Square invoice we sent, or call/text the front desk at ${ACADEMY_PHONE}.\n\nThank you,\nViya Academy`,
  },
  {
    id: "class-sms",
    channel: "sms" as const,
    name: "Class tonight",
    subject: "",
    body: `Hi {{firstName}} — class is tonight at Viya Academy. Check in at the front desk when you arrive. See you on the floor.`,
  },
  {
    id: "photo-sms",
    channel: "sms" as const,
    name: "Photoshoot reminder",
    subject: "",
    body: `Hi {{firstName}}, reminder about your Viya photoshoot. Please arrive camera-ready and bring any looks we discussed. Text us at ${ACADEMY_PHONE} if you are running late.`,
  },
  {
    id: "welcome-email",
    channel: "email" as const,
    name: "Welcome / pending start",
    subject: "Welcome to Viya Academy",
    body: `Hi {{firstName}},\n\nWelcome to Viya Academy + Agency. We are excited to have you. Please complete your deposit/payment in Square before your start date so we can get you on the floor.\n\nTalent resources: https://www.viyatalent.com/talentresources\n\n— Viya Academy\n${ACADEMY_ADDRESS}`,
  },
]
