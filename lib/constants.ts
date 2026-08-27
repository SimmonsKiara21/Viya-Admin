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
    body: `Hi {{firstName}},\n\nThis is a reminder from Viya Academy + Agency that a Square invoice of {{amount}} is due {{due}}.\n\nYou can pay from the Square invoice we sent, or call/text the front desk at ${ACADEMY_PHONE}.\n\n    Thank you,\nViya Academy`,
  },
  {
    id: "overdue-sms",
    channel: "sms" as const,
    name: "Overdue payment (text)",
    subject: "",
    body: `Hi {{firstName}}, this is Viya Academy. Your Square payment of {{amount}} was due {{due}} and is now overdue. Please update your card or reply here so we can help. Front desk: ${ACADEMY_PHONE}.`,
  },
  {
    id: "overdue-email",
    channel: "email" as const,
    name: "Overdue payment (email)",
    subject: "Viya Academy — your payment is overdue",
    body: `Hi {{firstName}},\n\nYour Square payment of {{amount}} was due {{due}} and is now overdue.\n\nPlease complete the invoice we sent, or call/text the front desk at ${ACADEMY_PHONE} and we will help you update the card on file.\n\nThank you,\nViya Academy`,
  },
  {
    id: "weekly-academy",
    channel: "sms" as const,
    name: "Weekly academy classes",
    subject: "This week's Viya Academy classes",
    body: `Hi {{firstName}}, this week at Viya Academy:\n\n• Wednesday 7:30–8:30pm\n• Saturday 4:00–5:00pm\n\nCheck in at the front desk when you arrive. See you on the floor.`,
  },
  {
    id: "weekly-subscriber",
    channel: "sms" as const,
    name: "Weekly subscriber classes",
    subject: "Viya subscriber class this week",
    body: `Hi {{firstName}}, reminder from Viya Talent Resources — subscriber class this week. Details are on the Classes tab. Reply if you need the time. See you there.`,
  },
  {
    id: "overdue-sms",
    channel: "sms" as const,
    name: "Overdue payment (text)",
    subject: "",
    body: `Hi {{firstName}}, this is Viya Academy. Your Square payment of {{amount}} was due {{due}} and is now overdue. Please update your card or reply here so we can help. Front desk: ${ACADEMY_PHONE}.`,
  },
  {
    id: "overdue-email",
    channel: "email" as const,
    name: "Overdue payment (email)",
    subject: "Viya Academy — your payment is overdue",
    body: `Hi {{firstName}},\n\nYour Square payment of {{amount}} was due {{due}} and is now overdue.\n\nPlease complete the invoice we sent, or call/text the front desk at ${ACADEMY_PHONE} and we will help you update the card on file.\n\nThank you,\nViya Academy`,
  },
  {
    id: "weekly-academy",
    channel: "sms" as const,
    name: "Weekly academy classes",
    subject: "This week's Viya Academy classes",
    body: `Hi {{firstName}}, this week at Viya Academy:\n\n• Wednesday 7:30–8:30pm\n• Saturday 4:00–5:00pm\n\nCheck in at the front desk when you arrive. See you on the floor.`,
  },
  {
    id: "weekly-subscriber",
    channel: "sms" as const,
    name: "Weekly subscriber classes",
    subject: "Viya subscriber class this week",
    body: `Hi {{firstName}}, reminder from Viya Talent Resources — subscriber class this week. Details are on the Classes tab. Reply if you need the time. See you there.`,
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
