"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContactLabelBadge } from "@/components/status-badge"
import { SUGGESTED_LABELS } from "@/lib/constants"
import { displayContactLabel } from "@/lib/contacts-labels"
import { cn } from "@/lib/utils"

export function LabelsEditor({
  labels,
  onChange,
}: {
  labels: string[]
  onChange: (labels: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const current = labels.filter(Boolean)

  function add(raw: string) {
    const value = raw.trim()
    if (!value) return
    const exists = current.some((label) => label.toLowerCase() === value.toLowerCase())
    if (!exists) onChange([...current, value])
    setDraft("")
  }

  function remove(label: string) {
    onChange(current.filter((item) => item !== label))
  }

  const suggestions = SUGGESTED_LABELS.filter(
    (label) => !current.some((item) => item.toLowerCase() === label.toLowerCase()),
  )

  return (
    <div className="grid gap-2">
      {current.length ? (
        <div className="flex flex-wrap gap-1.5">
          {current.map((label) => (
            <span key={label} className="inline-flex items-center gap-1">
              <ContactLabelBadge label={label} />
              <button
                type="button"
                onClick={() => remove(label)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${displayContactLabel(label)}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Add a tag"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(draft)
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => add(label)}
              className={cn(
                "rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              + {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
