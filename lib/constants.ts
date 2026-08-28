import type {
  ClassType,
  DocusignStatus,
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
export const JOTFORM_ATTENDANCE_ID = "262377942791167"
export const JOTFORM_ATTENDANCE_URL = "https://form.jotform.com/262377942791167"
export const JOTFORM_ATTENDANCE_SUBMIT = "https://submit.jotform.com/submit/262377942791167"

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

export const ALERT_PAYMENT_REMINDER = `This is a friendly reminder your payment is due! We tried to take a payment on our end, please try on yours, thank you! If you need to make a payment visit viyatalent.com/talentresources use password "viyatalent" to access it or text (602) 342-549`
export const DESK_PASSWORD = "viyatalent"
export const DESK_UNLOCK_KEY = "viya-desk-unlocked"

export const DOCUSIGN_LABELS: Record<DocusignStatus, string> = {
  none: "No envelope",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
}

export const DOCUSIGN_DOCUMENTS = [
  "Enrollment agreement",
  "Payment plan",
  "Model / acting release",
  "Subscriber agreement",
  "Photoshoot release",
  "Other",
] as const

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
    body: `Hi {{firstName}}, this week at Viya Academy:\n\n• Wednesday 7:30–8:30pm (Acting and Modeling rotate each week)\n• Saturday 4:00–5:00pm (Acting and Modeling rotate each week)\n\nAll black, camera-ready. Check in at the front desk.`,
  },
  {
    id: "weekly-subscriber",
    channel: "sms" as const,
    name: "Weekly subscriber classes",
    subject: "Viya subscriber class this week",
    body: `Hi {{firstName}}, Viya subscriber workshop this cycle:\n\n• Saturday 1:30–3:30pm (before the 4pm academy class)\n• Aug 15 — Acting: Mastering the Actor Self-Tape\n• Aug 29 — Modeling: Justin Chambers with Laura Scheele\n\nAll black, camera-ready. Text (602) 342-2902 with questions.`,
  },
  {
    id: "class-sms",
    channel: "sms" as const,
    name: "Class tonight",
    subject: "",
    body: `Hi {{firstName}} — class is tonight at Viya Academy. All black, camera-ready. Check in at the front desk.`,
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
  {
    id: "docusign-sms",
    channel: "sms" as const,
    name: "DocuSign reminder",
    subject: "",
    body: `Hi {{firstName}}, this is Viya Academy. Please complete your DocuSign so we can finish enrollment. Reply here if you need the link resent. Front desk: ${ACADEMY_PHONE}.`,
  },
]
