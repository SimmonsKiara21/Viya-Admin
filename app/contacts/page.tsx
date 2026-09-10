"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, Field, NativeSelect, PageHeader } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { ContactTagEditor } from "@/components/student-tag-editor"
import { useStore } from "@/lib/store"
import { matchesQuery, newId } from "@/lib/format"
import { CONTACT_FILTERS, CONTACT_LABELS, GOOGLE_CONTACT_FILTERS, GOOGLE_CONTACT_TAGS } from "@/lib/constants"
import { googleLabelForCategory, matchesContactFilter, onGoogleList } from "@/lib/contacts-labels"
import { isContact } from "@/lib/alerts"
import type { ContactCategory, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function ContactsPage() {
  const { students, addStudent } = useStore()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof CONTACT_FILTERS)[number]>("all")
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", notes: "", contactCategory: "" as ContactCategory | "" })

  const contacts = useMemo(() => {
    const googleList = category !== "all" && GOOGLE_CONTACT_FILTERS.includes(category)
    return students
      .filter((s) => {
        if (category === "all") return isContact(s) || onGoogleList(s, "all")
        if (googleList) return onGoogleList(s, category)
        return isContact(s)
      })
      .filter((s) => matchesQuery(s, query))
      .filter((s) => (googleList || category === "all" ? true : matchesContactFilter(s, category)))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
  }, [students, query, category])

  function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required.")
      return
    }
    const student: Student = {
      id: newId("CT").replace("CT-", "CT").toUpperCase(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nickname: "",
      email: form.email.trim(),
      phone: form.phone.trim(),
      age: null,
      program: "prospect",
      track: "none",
      paymentPlan: "none",
      enrollmentStatus: "contact",
      startDate: "",
      nextPaymentDate: "",
      nextPaymentAmount: null,
      installmentsLeft: null,
      notes: form.notes.trim(),
      contactCategory: form.contactCategory,
      subscriptionStatus: "none",
      photoshootStatus: "none",
      photoshootNotes: "",
      labels: googleLabelForCategory(form.contactCategory) ? [googleLabelForCategory(form.contactCategory)] : [],
      removedLabels: [],
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
    addStudent(student)
    toast.success(`${student.firstName} ${student.lastName} was added to Contacts.`)
    setForm({ firstName: "", lastName: "", phone: "", email: "", notes: "", contactCategory: "" })
    setAdding(false)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Leads"
        title="Contacts"
        description="Lists match Google Contacts: Current Student, Active Subscribers, SEPTEMBER PHOTOSHOOT LIST, and MODEL SOURCE NOVEMBER. Unlabeled people only show Edit."
        actions={
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus className="size-4" />
            Add contact
          </Button>
        }
      />

      {adding ? (
        <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card/80 p-5">
          <h2 className="font-heading text-xl">New contact</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Google list">
              <NativeSelect
                value={form.contactCategory}
                onChange={(e) => setForm({ ...form, contactCategory: e.target.value as ContactCategory | "" })}
              >
                <option value="">No list yet</option>
                {GOOGLE_CONTACT_TAGS.map((tag) => (
                  <option key={tag.category} value={tag.category}>
                    {tag.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save}>Save contact</Button>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, phone, or email"
          className="h-11 max-w-xl rounded-full px-4"
        />
        <div className="flex flex-wrap gap-2">
          {CONTACT_FILTERS.map((item) => {
            const count =
              item === "all"
                ? students.filter((s) => isContact(s) || onGoogleList(s, "all")).length
                : GOOGLE_CONTACT_FILTERS.includes(item)
                  ? students.filter((s) => onGoogleList(s, item)).length
                  : students.filter((s) => isContact(s) && matchesContactFilter(s, item)).length
            return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                category === item
                  ? "border-primary/50 bg-primary/16 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {item === "all" ? "All contacts" : item === "new" ? "Unlabeled" : CONTACT_LABELS[item]}
              {count ? ` · ${count}` : ""}
            </button>
            )
          })}
        </div>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts in this filter"
          description="Switch list or add a contact. Each Google list includes everyone with that label."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y divide-border px-2 py-1">
            {contacts.map((student) => (
              <div key={student.id} className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <StudentRow student={student} context="contacts" />
                </div>
                <div className="flex flex-wrap items-center gap-2 px-2 pb-2 sm:pb-0">
                  <ContactTagEditor student={student} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
