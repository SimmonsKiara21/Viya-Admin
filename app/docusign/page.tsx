"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { EmptyState, PageHeader, Panel } from "@/components/ui-helpers"
import { StudentRow } from "@/components/student-row"
import { StudentFormDialog } from "@/components/student-form-dialog"
import { DocusignBadge } from "@/components/status-badge"
import { useStore } from "@/lib/store"
import { DOCUSIGN_LABELS } from "@/lib/constants"
import { fullName } from "@/lib/format"
import type { DocusignStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function DocusignPage() {
  const { students } = useStore()
  const [filter, setFilter] = useState<DocusignStatus | "open" | "all">("open")
  const [addOpen, setAddOpen] = useState(false)

  const list = useMemo(() => {
    const base = students.filter((s) => {
      if (filter === "all") return s.docusignStatus !== "none" || s.docusignUrl || s.docusignEnvelopeId
      if (filter === "open") return ["sent", "viewed", "declined", "expired"].includes(s.docusignStatus)
      return s.docusignStatus === filter
    })
    return [...base].sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [students, filter])

  return (
    <div>
      <PageHeader
        eyebrow="Paperwork"
        title="DocuSign"
        description="Keep enrollment agreements and signing links on each student’s file. Add a new student with their DocuSign, or open a profile to paste an envelope."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add student + DocuSign
          </Button>
        }
      />

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
          description="Add a student and paste their DocuSign signing link or envelope ID."
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
                      className="text-[oklch(0.86_0.07_85)] hover:underline"
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

      <Panel className="mt-6">
        <p className="text-sm text-muted-foreground">
          Paste the DocuSign signing link from the envelope you sent. The desk stores it on the
          student file in this browser — it does not send the envelope from here.
        </p>
        <Link href="/students" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
          Open roster
        </Link>
      </Panel>

      <StudentFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
