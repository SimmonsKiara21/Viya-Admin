"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState, Field, PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { StudentFormDialog } from "@/components/student-form-dialog"
import { DocusignFields, withDocusignDefaults } from "@/components/docusign-fields"
import { DocusignBadge } from "@/components/status-badge"
import { useStore } from "@/lib/store"
import { DOCUSIGN_LABELS } from "@/lib/constants"
import { fullName, matchesQuery } from "@/lib/format"
import type { DocusignStatus, Student } from "@/lib/types"
import { cn } from "@/lib/utils"

const emptyEnvelope = {
  docusignStatus: "sent" as DocusignStatus,
  docusignUrl: "",
  docusignEnvelopeId: "",
  docusignDocument: "Enrollment agreement",
  docusignSentAt: "",
  docusignSignedAt: "",
  docusignNotes: "",
}

export default function DocusignPage() {
  const { students, updateStudent } = useStore()
  const [filter, setFilter] = useState<DocusignStatus | "open" | "all">("open")
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pickedId, setPickedId] = useState("")
  const [envelope, setEnvelope] = useState(emptyEnvelope)

  const list = useMemo(() => {
    const base = students.filter((s) => {
      if (filter === "all") return s.docusignStatus !== "none" || s.docusignUrl || s.docusignEnvelopeId
      if (filter === "open") return ["sent", "viewed", "declined", "expired"].includes(s.docusignStatus)
      return s.docusignStatus === filter
    })
    return [...base].sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [students, filter])

  const hits = useMemo(() => {
    if (!query.trim()) return []
    return students.filter((s) => matchesQuery(s, query)).slice(0, 8)
  }, [query, students])

  const picked = students.find((s) => s.id === pickedId)

  function attach() {
    if (!picked) {
      toast.error("Pick a student first.")
      return
    }
    if (!envelope.docusignUrl && !envelope.docusignEnvelopeId) {
      toast.error("Add a signing link or envelope ID.")
      return
    }
    updateStudent(picked.id, withDocusignDefaults({ ...picked, ...envelope }))
    toast.success(`DocuSign saved on ${fullName(picked)}.`)
    setQuery("")
    setPickedId("")
    setEnvelope(emptyEnvelope)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Paperwork"
        title="DocuSign"
        description="Keep enrollment agreements and signing links on each student’s file. Add a new student with their DocuSign, or attach an envelope to someone already on the roster."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add student + DocuSign
          </Button>
        }
      />

      <Panel className="mb-6 grid gap-4">
        <div>
          <h2 className="font-heading text-2xl">Attach to a student</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search someone already on the enrollment roster, then paste their DocuSign.
          </p>
        </div>
        <Field label="Student">
          <Input
            placeholder="Search name, ID, phone, or email"
            value={picked ? fullName(picked) : query}
            onChange={(e) => {
              setPickedId("")
              setQuery(e.target.value)
            }}
          />
        </Field>
        {!picked && hits.length > 0 ? (
          <ul className="overflow-hidden rounded-xl border border-border">
            {hits.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setPickedId(s.id)
                    setQuery("")
                    setEnvelope({
                      docusignStatus: s.docusignStatus === "none" ? "sent" : s.docusignStatus,
                      docusignUrl: s.docusignUrl,
                      docusignEnvelopeId: s.docusignEnvelopeId,
                      docusignDocument: s.docusignDocument || "Enrollment agreement",
                      docusignSentAt: s.docusignSentAt,
                      docusignSignedAt: s.docusignSignedAt,
                      docusignNotes: s.docusignNotes,
                    })
                  }}
                >
                  <span>{fullName(s)}</span>
                  <span className="text-xs text-muted-foreground">#{s.id}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {picked ? (
          <>
            <p className="text-sm">
              Attaching to <span className="font-medium">{fullName(picked)}</span>{" "}
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => {
                  setPickedId("")
                  setEnvelope(emptyEnvelope)
                }}
              >
                Change
              </button>
            </p>
            <DocusignFields
              value={envelope as Pick<
                Student,
                | "docusignStatus"
                | "docusignUrl"
                | "docusignEnvelopeId"
                | "docusignDocument"
                | "docusignSentAt"
                | "docusignSignedAt"
                | "docusignNotes"
              >}
              onChange={(patch) => setEnvelope((prev) => ({ ...prev, ...patch }))}
            />
            <Button className="w-fit" onClick={attach}>
              Save DocuSign on file
            </Button>
          </>
        ) : null}
      </Panel>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "sent", "viewed", "signed", "declined", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              filter === key
                ? "border-[oklch(0.78_0.08_85/0.5)] bg-[oklch(0.78_0.08_85/0.16)]"
                : "border-border text-muted-foreground",
            )}
          >
            {key === "open" ? "Needs signature" : key === "all" ? "All with DocuSign" : DOCUSIGN_LABELS[key]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No DocuSign files in this view"
          description="Add a student with their DocuSign, or attach an envelope to someone already on the roster."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            {list.length} file{list.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y divide-border">
            {list.map((student) => (
              <div key={student.id} className="px-2 py-1">
                <StudentRow student={student} />
                <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-xs text-muted-foreground">
                  <DocusignBadge status={student.docusignStatus} />
                  <span>{student.docusignDocument || "No document named"}</span>
                  {student.docusignEnvelopeId ? <span>#{student.docusignEnvelopeId}</span> : null}
                  {student.docusignUrl ? (
                    <a
                      href={student.docusignUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open DocuSign
                    </a>
                  ) : (
                    <Link href={`/students/${student.id}`} className="hover:underline">
                      Add link on {fullName(student).split(" ")[0]}’s file
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/students" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-6")}>
        Open roster
      </Link>

      <StudentFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
