"use client"

import { Field, NativeSelect } from "@/components/ui-helpers"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DOCUSIGN_DOCUMENTS, DOCUSIGN_LABELS } from "@/lib/constants"
import type { DocusignStatus, Student } from "@/lib/types"

export function DocusignFields({
  value,
  onChange,
}: {
  value: Pick<
    Student,
    | "docusignStatus"
    | "docusignUrl"
    | "docusignEnvelopeId"
    | "docusignDocument"
    | "docusignSentAt"
    | "docusignSignedAt"
    | "docusignNotes"
  >
  onChange: (patch: Partial<Student>) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="DocuSign document">
        <NativeSelect
          value={value.docusignDocument}
          onChange={(e) => onChange({ docusignDocument: e.target.value })}
        >
          <option value="">Choose a document</option>
          {DOCUSIGN_DOCUMENTS.map((doc) => (
            <option key={doc} value={doc}>
              {doc}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="DocuSign status">
        <NativeSelect
          value={value.docusignStatus}
          onChange={(e) => onChange({ docusignStatus: e.target.value as DocusignStatus })}
        >
          {Object.entries(DOCUSIGN_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Signing link" className="sm:col-span-2">
        <Input
          type="url"
          placeholder="https://app.docusign.com/..."
          value={value.docusignUrl}
          onChange={(e) => onChange({ docusignUrl: e.target.value })}
        />
      </Field>
      <Field label="Envelope ID">
        <Input
          placeholder="DocuSign envelope ID"
          value={value.docusignEnvelopeId}
          onChange={(e) => onChange({ docusignEnvelopeId: e.target.value })}
        />
      </Field>
      <Field label="Sent">
        <Input
          type="date"
          value={value.docusignSentAt}
          onChange={(e) => onChange({ docusignSentAt: e.target.value })}
        />
      </Field>
      <Field label="Signed">
        <Input
          type="date"
          value={value.docusignSignedAt}
          onChange={(e) => onChange({ docusignSignedAt: e.target.value })}
        />
      </Field>
      <Field label="DocuSign notes" className="sm:col-span-2">
        <Textarea
          rows={3}
          placeholder="Who needs to sign, follow-up, parent/guardian…"
          value={value.docusignNotes}
          onChange={(e) => onChange({ docusignNotes: e.target.value })}
        />
      </Field>
    </div>
  )
}

export function withDocusignDefaults<T extends Partial<Student>>(student: T): T {
  const next = { ...student }
  if (next.docusignUrl && (!next.docusignStatus || next.docusignStatus === "none")) {
    next.docusignStatus = "sent"
  }
  if (next.docusignStatus === "sent" && !next.docusignSentAt) {
    next.docusignSentAt = new Date().toISOString().slice(0, 10)
  }
  if (next.docusignStatus === "signed" && !next.docusignSignedAt) {
    next.docusignSignedAt = new Date().toISOString().slice(0, 10)
  }
  return next
}
