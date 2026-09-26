import { foldName, matchStudentByName } from "./match-name"
import { academyDateISO, newId } from "./format"
import type { Student, SubscriptionPlan, SubscriptionStatus } from "./types"

export const SUBSCRIBER_ROSTER_ID = "2026-09-26-active-filter"

export type DeskSubscriberRow = {
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  status: SubscriptionStatus
  startDate: string
  aliases: string[]
  plan?: SubscriptionPlan
}

export const DESK_SUBSCRIBERS: DeskSubscriberRow[] = [
  { firstName: "Lucas", lastName: "Sanders", nickname: "", email: "tmsanders0224@gmail.com", phone: "602-332-2545", status: "active", startDate: "", aliases: [], plan: "og" },
  { firstName: "Ailen", lastName: "Gallegos", nickname: "", email: "rosaaliiciia42@gmail.com", phone: "480-648-1471", status: "active", startDate: "", aliases: [], plan: "og" },
  { firstName: "Julie", lastName: "Gallegos", nickname: "", email: "rosaaliiciia42@gmail.com", phone: "480-648-1471", status: "active", startDate: "", aliases: [] },
  { firstName: "Sadie", lastName: "Aschebrock", nickname: "", email: "sylph182@gmail.com", phone: "623-340-7140", status: "active", startDate: "", aliases: [] },
  { firstName: "Tanya", lastName: "Papuga", nickname: "", email: "papugatanya@gmail.com", phone: "407-508-9650", status: "active", startDate: "", aliases: [], plan: "standard" },
  { firstName: "Karissa", lastName: "Sendlak", nickname: "", email: "sendlakkarissa@gmail.com", phone: "520-449-0232", status: "active", startDate: "", aliases: [], plan: "og" },
  { firstName: "Crescent", lastName: "Brewer", nickname: "Angel", email: "angel.brewer445@gmail.com", phone: "480-740-3996", status: "active", startDate: "", aliases: ["angel brewer"], plan: "og" },
  { firstName: "Justice", lastName: "Belcher", nickname: "", email: "belcheramber96@gmail.com", phone: "480-547-5297", status: "active", startDate: "", aliases: [], plan: "og" },
  { firstName: "Jacob", lastName: "Lubin", nickname: "", email: "jlubin6000@gmail.com", phone: "703-509-8003", status: "active", startDate: "", aliases: [], plan: "og" },
  { firstName: "Stacey", lastName: "Boucher", nickname: "", email: "staceyb60@gmail.com", phone: "347-585-2553", status: "active", startDate: "", aliases: [] },
  { firstName: "Dianica", lastName: "Vargas", nickname: "", email: "dnh627@gmail.com", phone: "623-203-2868", status: "active", startDate: "", aliases: [] },
  { firstName: "Adam", lastName: "Montoya", nickname: "", email: "carrie.montoya@icloud.com", phone: "623-205-4668", status: "active", startDate: "", aliases: [] },
  { firstName: "Cheylo", lastName: "Rallis", nickname: "", email: "cherall@icloud.com", phone: "615-706-0552", status: "active", startDate: "", aliases: [] },
  { firstName: "Patrick", lastName: "Montgomery", nickname: "", email: "katehmontgomery@cox.net", phone: "602-318-0515", status: "active", startDate: "", aliases: [] },
  { firstName: "Michaela", lastName: "Smith", nickname: "", email: "michaelasmith122012@gmail.com", phone: "602-502-8086", status: "active", startDate: "", aliases: [] },
  { firstName: "Larry", lastName: "Brown", nickname: "", email: "xhalekc@gmail.com", phone: "602-518-5470", status: "active", startDate: "", aliases: [] },
  { firstName: "Kyngtavien", lastName: "Parker", nickname: "", email: "actkyngtavion@gmail.com", phone: "602-860-0201", status: "active", startDate: "", aliases: ["kyngtavion parker"] },
  { firstName: "Haven", lastName: "Arney", nickname: "", email: "dawnymariearney@gmail.com", phone: "928-228-8707", status: "active", startDate: "", aliases: [] },
  { firstName: "Nehemiah", lastName: "Chidester-Mendoza", nickname: "", email: "chidestermendoza@gmail.com", phone: "602-405-4325", status: "active", startDate: "", aliases: ["nehemiah chidester mendoza"] },
  { firstName: "Emily", lastName: "Hernandez", nickname: "", email: "emilyh22404@gmail.com", phone: "520-392-0888", status: "active", startDate: "", aliases: [] },
  { firstName: "Adana", lastName: "Venegas", nickname: "", email: "adanavenegas7@gmail.com", phone: "480-689-3554", status: "active", startDate: "", aliases: [] },
  { firstName: "Faith", lastName: "OBrien", nickname: "", email: "June.e.obrien3.ctr@army.mill", phone: "218-591-3690", status: "active", startDate: "", aliases: ["faith o'brien", "faith obrien"] },
  { firstName: "Liliana", lastName: "Aguilar", nickname: "", email: "meesha.aguilar@yahoo.com", phone: "901-337-0914", status: "active", startDate: "", aliases: [] },
  { firstName: "Ariel", lastName: "Gonzalez", nickname: "", email: "aigonzalez5743@gmail.com", phone: "602-813-6065", status: "active", startDate: "", aliases: [] },
  { firstName: "Grace", lastName: "Boening", nickname: "", email: "loloboening@gmail.com", phone: "517-204-6658", status: "active", startDate: "", aliases: [] },
  { firstName: "Delex", lastName: "Taghap", nickname: "", email: "delextaghap98@gmail.com", phone: "480-436-0271", status: "active", startDate: "", aliases: [] },
  { firstName: "Noelle", lastName: "Shimmin", nickname: "", email: "majikellie@gmail.com", phone: "507-358-5094", status: "active", startDate: "", aliases: [] },
  { firstName: "Joshua", lastName: "Breslin", nickname: "", email: "gbreslin623@gmail.com", phone: "623-252-7223", status: "active", startDate: "", aliases: [] },
  { firstName: "Joanna", lastName: "Garcia", nickname: "", email: "joannagarcia1229@icloud.com", phone: "626-324-7704", status: "active", startDate: "", aliases: [] },
  { firstName: "Nivine", lastName: "Sakkal", nickname: "", email: "nivinesakkal@hotmail.com", phone: "602-687-0744", status: "active", startDate: "", aliases: [] },
  { firstName: "Kayliegh", lastName: "Mckenzie", nickname: "", email: "slumberkitty@icloud.com", phone: "480-469-6352", status: "active", startDate: "", aliases: ["kayleigh mckenzie"] },
  { firstName: "Scarlett", lastName: "Petroff", nickname: "", email: "mark_petroff@hotmail.com", phone: "602-525-1903", status: "active", startDate: "", aliases: [] },
  { firstName: "Karla", lastName: "De Guzman", nickname: "", email: "kcamisidrodg@gmail.com", phone: "808-232-3768", status: "active", startDate: "", aliases: ["karla deguzman"], plan: "og" },
  { firstName: "Jaime", lastName: "Garcia", nickname: "", email: "surgarcia666@gmail.com", phone: "480-519-3387", status: "active", startDate: "", aliases: [] },
  { firstName: "Aaliyah", lastName: "Moore", nickname: "", email: "aa.roman.2720@gmail.com", phone: "715-559-9839", status: "active", startDate: "", aliases: [] },
  { firstName: "Catherine", lastName: "Conder", nickname: "", email: "catherine.conder@gmail.com", phone: "317-703-0705", status: "active", startDate: "", aliases: [] },
  { firstName: "Brylee", lastName: "Sutton", nickname: "", email: "bryleesutton6@gmail.com", phone: "623-225-9303", status: "active", startDate: "", aliases: [] },
  { firstName: "Melissa", lastName: "Flores", nickname: "", email: "assilemflores89@gmail.com", phone: "602-643-6495", status: "active", startDate: "", aliases: [] },
  { firstName: "Tucker", lastName: "Fordyce", nickname: "", email: "andrewtuckerfordyce@gmail.com", phone: "480-678-5253", status: "active", startDate: "", aliases: [] },
  { firstName: "Gabriel", lastName: "Pineira", nickname: "", email: "gabepine2006@gmail.com", phone: "602-578-3874", status: "active", startDate: "", aliases: ["gabriel piñeira", "gabriel pineira"] },
  { firstName: "Elaine", lastName: "Medeins", nickname: "", email: "elaine@wherehopelives.org", phone: "602-810-2040", status: "active", startDate: "", aliases: [] },
  { firstName: "Katherine", lastName: "Sanchez", nickname: "", email: "kathesanrodri99@gmail.com", phone: "480-812-5997", status: "active", startDate: "", aliases: [] },
  { firstName: "Landon", lastName: "Flenniken", nickname: "", email: "flenniken.toni@gmail.com", phone: "714-916-4217", status: "active", startDate: "", aliases: [] },
  { firstName: "Allyson", lastName: "Ceron", nickname: "", email: "allysonceronofficial@gmail.com", phone: "602-703-0835", status: "active", startDate: "", aliases: [] },
  { firstName: "Natalie", lastName: "Vanderwerff", nickname: "", email: "natvanderwerff17@gmail.com", phone: "262-581-6745", status: "active", startDate: "", aliases: [] },
  { firstName: "Mikayla", lastName: "Evans", nickname: "", email: "mikayla.evans68@gmail.com", phone: "928-322-3017", status: "active", startDate: "", aliases: [] },
  { firstName: "Johnny", lastName: "Dang", nickname: "", email: "jdang7306@gmail.com", phone: "623-500-9190", status: "active", startDate: "", aliases: [] },
  { firstName: "Sarah", lastName: "Herrera", nickname: "", email: "sarahelizaherre@gmail.com", phone: "602-774-6698", status: "active", startDate: "", aliases: [] },
  { firstName: "Sophia", lastName: "Scott", nickname: "", email: "eniebla68@gmail.com", phone: "714-917-9190", status: "active", startDate: "", aliases: [] },
  { firstName: "Kenna", lastName: "Jones", nickname: "", email: "kenna.jones04@gmail.com", phone: "602-814-2080", status: "active", startDate: "", aliases: [] },
  { firstName: "Sarah", lastName: "Alley", nickname: "", email: "sarahnoella@yahoo.com", phone: "623-606-3841", status: "active", startDate: "", aliases: [] },
  { firstName: "Rhiann", lastName: "Phillips", nickname: "", email: "rhiannleadawn@gmail.com", phone: "928-606-8386", status: "active", startDate: "", aliases: [] },
  { firstName: "Malaika", lastName: "Jones", nickname: "", email: "jablkrose@gmail.com", phone: "520-701-2068", status: "active", startDate: "", aliases: [] },
  { firstName: "Julissa", lastName: "Perez Baeza", nickname: "", email: "julissapb03@gmail.com", phone: "480-823-6407", status: "active", startDate: "", aliases: ["julissa perez", "julissa baeza"] },
  { firstName: "Divine", lastName: "Kungwa", nickname: "", email: "kizengamuye7@gmail.com", phone: "480-803-8095", status: "active", startDate: "", aliases: [] },
  { firstName: "Herberto", lastName: "Avila", nickname: "", email: "herbertoavila23@gmail.com", phone: "928-495-7605", status: "active", startDate: "", aliases: [] },
  { firstName: "Tia", lastName: "Fed", nickname: "", email: "tiafed319@icloud.com", phone: "480-295-2760", status: "interested", startDate: "", aliases: [] },
  { firstName: "Connor", lastName: "Williams", nickname: "", email: "hunternash1699@gmail.com", phone: "602-980-9942", status: "interested", startDate: "", aliases: [] },
  { firstName: "Ellie", lastName: "Harris", nickname: "", email: "eharris1227@icloud.com", phone: "623-521-5578", status: "interested", startDate: "", aliases: ["harris ellie"] },
  { firstName: "Abril", lastName: "Becerra", nickname: "", email: "becerraloulou@gmail.com", phone: "623-213-1611", status: "interested", startDate: "", aliases: [] },
  { firstName: "Itati", lastName: "Alcantar", nickname: "", email: "itati.a@yahoo.com", phone: "520-280-3913", status: "interested", startDate: "", aliases: [] },
  { firstName: "Jackson", lastName: "Hairston", nickname: "", email: "jacksonhairston@icloud.com", phone: "480-406-7345", status: "interested", startDate: "2026-06-10", aliases: [] },
]

function phoneKey(phone: string) {
  const digits = (phone || "").replace(/\D/g, "")
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(-10)
}

function emailKey(email: string) {
  return (email || "").trim().toLowerCase()
}

function rowNames(row: DeskSubscriberRow) {
  return [
    foldName(`${row.firstName} ${row.lastName}`),
    row.nickname ? foldName(`${row.nickname} ${row.lastName}`) : "",
    ...row.aliases.map(foldName),
  ].filter(Boolean)
}

function studentNames(student: Pick<Student, "firstName" | "lastName" | "nickname">) {
  return [
    foldName(`${student.firstName} ${student.lastName}`),
    student.nickname ? foldName(`${student.nickname} ${student.lastName}`) : "",
  ].filter(Boolean)
}

function firstKeys(row: DeskSubscriberRow) {
  return [foldName(row.firstName), foldName(row.nickname)].filter(Boolean)
}

function sameFirstName(student: Pick<Student, "firstName" | "lastName" | "nickname">, row: DeskSubscriberRow) {
  const theirs = [foldName(student.firstName), foldName(student.nickname)].filter(Boolean)
  return firstKeys(row).some((name) => theirs.includes(name))
}

function samePerson(student: Pick<Student, "firstName" | "lastName" | "nickname" | "email" | "phone">, row: DeskSubscriberRow) {
  const names = studentNames(student)
  if (rowNames(row).some((name) => names.includes(name))) return true
  if (!sameFirstName(student, row)) return false
  const email = emailKey(student.email)
  const phone = phoneKey(student.phone)
  if (email && emailKey(row.email) === email) return true
  if (phone && phone.length >= 10 && phoneKey(row.phone) === phone) return true
  return false
}

export function matchDeskSubscriber(student: Pick<Student, "firstName" | "lastName" | "nickname" | "email" | "phone">) {
  return DESK_SUBSCRIBERS.find((row) => samePerson(student, row))
}

export function isDeskSubscriber(
  student: Pick<Student, "firstName" | "lastName" | "nickname" | "email" | "phone"> &
    Partial<Pick<Student, "program" | "paymentPlan" | "subscriptionStatus" | "deskLocks">>,
) {
  if (student.subscriptionStatus === "cancelled") return false
  if (matchDeskSubscriber(student)) return true
  return (
    Boolean(student.deskLocks?.subscription) &&
    (student.program === "subscriber" || student.paymentPlan === "subscription") &&
    student.subscriptionStatus !== "none"
  )
}

export function addToSubscribers(
  student: Student,
  status: SubscriptionStatus = student.subscriptionStatus === "none" || student.subscriptionStatus === "cancelled"
    ? "active"
    : student.subscriptionStatus,
): Partial<Student> {
  const nextStatus = status === "none" || status === "cancelled" ? "active" : status
  const labels = [
    ...new Set([
      ...(student.labels || []).filter((label) => !/current student/i.test(label)),
      "Active Subscribers",
    ]),
  ]
  const removed = [...new Set([...(student.removedLabels || []), "Current Student"])].filter(
    (label) => !/active subscriber/i.test(label),
  )
  const current = nextStatus === "active"
  const fromContact = student.enrollmentStatus === "contact" || student.enrollmentStatus === "pending"
  return {
    program: "subscriber",
    track: "none",
    paymentPlan: "subscription",
    enrollmentStatus: current || fromContact ? "current" : student.enrollmentStatus,
    startDate: student.startDate || academyDateISO(),
    nextPaymentDate: student.nextPaymentDate || nextFirstOfMonth(),
    nextPaymentAmount: student.nextPaymentAmount ?? 51.49,
    overdueSince: current ? "" : student.overdueSince,
    subscriptionStatus: nextStatus,
    subscriptionPlan: student.subscriptionPlan === "none" ? "standard" : student.subscriptionPlan,
    contactCategory: "subscriber",
    labels,
    removedLabels: removed,
    deskLocks: { ...student.deskLocks, subscription: true, status: true, overdueSince: current ? false : student.deskLocks?.overdueSince },
  }
}

export function moveStudentToTalent(student: Student): Partial<Student> {
  const labels = (student.labels || []).filter((label) => !/active subscriber/i.test(label))
  if (!labels.some((label) => /current student/i.test(label))) labels.push("Current Student")
  return {
    program: "academy",
    track: student.track === "none" ? "academy" : student.track,
    paymentPlan: student.paymentPlan === "subscription" || student.paymentPlan === "none" ? "pp" : student.paymentPlan,
    enrollmentStatus: student.enrollmentStatus === "contact" ? "current" : student.enrollmentStatus,
    subscriptionStatus: "none",
    contactCategory: "current-student",
    labels,
    removedLabels: [...new Set([...(student.removedLabels || []), "Active Subscribers"])],
    deskLocks: { ...student.deskLocks, subscription: true, status: true },
  }
}

export function deskListKind(student: Student): "talent" | "subscriber" | "contact" {
  if (student.program === "subscriber" || student.paymentPlan === "subscription") {
    return student.subscriptionStatus === "cancelled" ? "contact" : "subscriber"
  }
  if (student.program === "prospect" || student.enrollmentStatus === "contact") return "contact"
  return "talent"
}

export function setDeskList(student: Student, list: "talent" | "subscriber" | "contact"): Partial<Student> {
  if (list === "subscriber") return addToSubscribers(student)
  if (list === "contact") return moveStudentToContact(student)
  return moveStudentToTalent(student)
}

function findStudentForRow(row: DeskSubscriberRow, students: Student[], taken: Set<string>) {
  const unused = students.filter((student) => !taken.has(student.id))
  const exact = unused.find((student) => samePerson(student, row))
  if (exact) return exact
  const named = matchStudentByName(`${row.firstName} ${row.lastName}`, unused)
  if (named && sameFirstName(named, row)) return named
  if (row.nickname) {
    const nick = matchStudentByName(`${row.nickname} ${row.lastName}`, unused)
    if (nick && sameFirstName(nick, row)) return nick
  }
  return undefined
}

function planAmount(plan: SubscriptionPlan | undefined) {
  if (plan === "og") return 5.14
  if (plan === "standard") return 51.49
  if (plan === "plus") return 100
  return null
}

function promoteSubscriber(student: Student, row: DeskSubscriberRow): Student {
  const labels = [...new Set([...(student.labels || []).filter((label) => !/current student/i.test(label)), "Active Subscribers"])]
  const removed = [...new Set([...(student.removedLabels || []), "Current Student"])]
  const plan = row.plan || student.subscriptionPlan
  const amount = planAmount(plan)
  return {
    ...student,
    email: student.email || row.email,
    phone: student.phone || row.phone,
    nickname: student.nickname || row.nickname,
    program: "subscriber",
    track: "none",
    paymentPlan: "subscription",
    enrollmentStatus:
      foldName(`${row.firstName} ${row.lastName}`) === "tanya papuga"
        ? "overdue"
        : student.deskLocks?.status
          ? student.enrollmentStatus
          : "current",
    startDate: student.startDate || row.startDate,
    subscriptionStatus: student.deskLocks?.subscription ? student.subscriptionStatus : row.status,
    subscriptionPlan:
      student.deskLocks?.subscription && student.subscriptionPlan !== "none"
        ? student.subscriptionPlan
        : plan === "none"
          ? student.subscriptionPlan
          : plan,
    nextPaymentAmount:
      student.deskLocks?.subscription && student.subscriptionPlan !== "none"
        ? student.nextPaymentAmount
        : amount ?? student.nextPaymentAmount,
    contactCategory: "subscriber",
    labels,
    removedLabels: removed,
    deskLocks:
      !student.deskLocks?.subscription && (row.status === "interested" || row.status === "paused")
        ? { ...student.deskLocks, subscription: true }
        : student.deskLocks,
  }
}

function subscriberFactory(row: DeskSubscriberRow): Student {
  return {
    id: newId("SUB"),
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    email: row.email,
    phone: row.phone,
    age: null,
    program: "subscriber",
    track: "none",
    paymentPlan: "subscription",
    enrollmentStatus: "current",
    startDate: row.startDate,
    nextPaymentDate: "",
    nextPaymentAmount: planAmount(row.plan) ?? 51.49,
    installmentsLeft: null,
    overdueSince: "",
    notes: "",
    contactCategory: "subscriber",
    subscriptionStatus: row.status,
    subscriptionPlan: row.plan || "none",
    manualHighlight: "none",
    subscriptionRunDate: "",
    photoshootStatus: "none",
    photoshootNotes: "",
    measurements: { height: "", bust: "", waist: "", hips: "", dress: "", shoe: "" },
    labels: ["Active Subscribers"],
    removedLabels: ["Current Student"],
    deskLocks: {},
    classTime: "",
    photoUrl: "",
    docusignStatus: "none",
    docusignUrl: "",
    docusignEnvelopeId: "",
    docusignDocument: "",
    docusignSentAt: "",
    docusignSignedAt: "",
    docusignNotes: "",
  }
}

export function removeFromSubscribers(student: Student): Partial<Student> {
  const labels = (student.labels || []).filter((label) => !/active subscriber/i.test(label))
  return {
    program: "prospect",
    track: "none",
    paymentPlan: "none",
    enrollmentStatus: "contact",
    subscriptionStatus: "cancelled",
    subscriptionPlan: "none",
    contactCategory: "",
    labels,
    removedLabels: [...new Set([...(student.removedLabels || []), "Active Subscribers"])],
    deskLocks: { ...student.deskLocks, status: true, subscription: true },
  }
}

export function moveStudentToContact(student: Student): Partial<Student> {
  if (student.program === "subscriber" || student.paymentPlan === "subscription") {
    return removeFromSubscribers(student)
  }
  return {
    program: "prospect",
    track: "none",
    paymentPlan: "none",
    enrollmentStatus: "contact",
    contactCategory: "",
    deskLocks: { ...student.deskLocks, status: true },
  }
}

function nextFirstOfMonth(from = academyDateISO()) {
  const [year, month] = from.slice(0, 10).split("-").map(Number)
  if (!year || !month) return "2026-10-01"
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
}

export function markSubscriberCurrent(student: Student): Partial<Student> {
  const due = nextFirstOfMonth()
  return {
    enrollmentStatus: "current",
    subscriptionStatus:
      student.subscriptionStatus === "cancelled" || student.subscriptionStatus === "none"
        ? "active"
        : student.subscriptionStatus,
    overdueSince: "",
    nextPaymentDate: due,
    deskLocks: { ...student.deskLocks, status: true, overdueSince: false, subscription: true },
  }
}

export function clearStudentTags(student: Student): Partial<Student> {
  return {
    labels: [],
    removedLabels: [...new Set([...(student.removedLabels || []), ...(student.labels || [])])],
  }
}

function demoteExtraSubscriber(student: Student): Student {
  return { ...student, ...removeFromSubscribers(student), subscriptionStatus: "none" }
}

function looksLikeOldSubscriber(student: Student) {
  if (student.program === "subscriber" || student.paymentPlan === "subscription") return true
  return (student.labels || []).some((label) => /active subscriber/i.test(label))
}

function applyNamedDeskFixes(students: Student[]) {
  return students.map((student) => {
    const name = foldName(`${student.firstName} ${student.lastName}`)
    if (student.id === "0627" || name === "sadie horsley") {
      return {
        ...student,
        paymentPlan: "pif" as const,
        enrollmentStatus: "pif" as const,
        installmentsLeft: 0,
        nextPaymentDate: "",
        nextPaymentAmount: null,
        startDate: student.startDate || "2026-04-01",
        deskLocks: { ...student.deskLocks, status: true, installments: true },
      }
    }
    if (student.id === "1147" || name === "scarlett petroff") {
      const keepPlan = student.deskLocks?.subscription && student.subscriptionPlan !== "none" && student.subscriptionPlan !== "plus"
      return {
        ...student,
        ...markSubscriberCurrent(student),
        nextPaymentDate: student.nextPaymentDate || "2026-10-01",
        nextPaymentAmount: keepPlan ? student.nextPaymentAmount : 100,
        subscriptionPlan: keepPlan ? student.subscriptionPlan : "plus",
      }
    }
    return student
  })
}

export function applyDeskSubscriberRoster(students: Student[]) {
  const next = students.map((student) => ({ ...student }))
  const taken = new Set<string>()
  const created: Student[] = []

  for (const row of DESK_SUBSCRIBERS) {
    const existing = findStudentForRow(row, next, taken)
    if (existing) {
      const index = next.findIndex((student) => student.id === existing.id)
      if (
        existing.deskLocks?.subscription &&
        (existing.subscriptionStatus === "cancelled" ||
          existing.enrollmentStatus === "contact" ||
          (existing.program !== "subscriber" && existing.paymentPlan !== "subscription"))
      ) {
        taken.add(existing.id)
        continue
      }
      next[index] = promoteSubscriber(existing, row)
      taken.add(existing.id)
      continue
    }
    const fresh = subscriberFactory(row)
    created.push(fresh)
    taken.add(fresh.id)
  }

  const merged = applyNamedDeskFixes(
    [...created, ...next].map((student) => {
      if (taken.has(student.id)) return student
      const staffAdded =
        Boolean(student.deskLocks?.subscription) &&
        (student.program === "subscriber" || student.paymentPlan === "subscription") &&
        student.subscriptionStatus !== "cancelled"
      if (staffAdded || !looksLikeOldSubscriber(student)) return student
      return demoteExtraSubscriber(student)
    }),
  )
  return { students: merged, added: created.length, kept: taken.size - created.length }
}
