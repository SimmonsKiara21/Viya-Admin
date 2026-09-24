"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui-helpers"
import type { Photoshoot } from "@/lib/types"

export function PhotoshootEditor({
  open,
  onOpenChange,
  shoot,
  title,
  description,
  submitLabel,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shoot?: Photoshoot | null
  title: string
  description: string
  submitLabel: string
  onSave: (next: { label: string; notes: string; archived: boolean }) => void
}) {
  const [label, setLabel] = useState(shoot?.label || "")
  const [notes, setNotes] = useState(shoot?.notes || "")
  const [archived, setArchived] = useState(Boolean(shoot?.archived))

  useEffect(() => {
    if (!open) return
    setLabel(shoot?.label || "")
    setNotes(shoot?.notes || "")
    setArchived(Boolean(shoot?.archived))
  }, [open, shoot])

  function save() {
    const name = label.trim()
    if (!name) return
    onSave({ label: name, notes: notes.trim(), archived })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Photoshoot name">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Holiday mini, Model Source December…"
            />
          </Field>
          <Field label="What we want">
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Looks, wardrobe, location, who should be on this shoot…"
            />
          </Field>
          {shoot ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Move to Prior shoots
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!label.trim()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
