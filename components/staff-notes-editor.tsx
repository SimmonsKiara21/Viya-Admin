"use client"

import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DESK_SAVE_EVENT, useStore } from "@/lib/store"
import type { Student } from "@/lib/types"

export function StaffNotesEditor({ student }: { student: Student }) {
  const { updateStudent, saveDesk } = useStore()
  const [draft, setDraft] = useState(student.notes)
  const [justSaved, setJustSaved] = useState(false)
  const draftRef = useRef(draft)
  const studentRef = useRef(student)
  const committedRef = useRef(student.notes)

  draftRef.current = draft
  studentRef.current = student

  useEffect(() => {
    setDraft(student.notes)
    committedRef.current = student.notes
    setJustSaved(false)
  }, [student.id])

  useEffect(() => {
    if (draftRef.current === committedRef.current) {
      setDraft(student.notes)
      committedRef.current = student.notes
    }
  }, [student.notes])

  function commitToStore() {
    const next = draftRef.current
    const current = studentRef.current
    if (next === current.notes && current.deskLocks?.notes) return false
    flushSync(() => {
      updateStudent(current.id, {
        notes: next,
        deskLocks: { ...current.deskLocks, notes: true },
      })
    })
    committedRef.current = next
    return true
  }

  useEffect(() => {
    const onSave = () => {
      commitToStore()
    }
    window.addEventListener(DESK_SAVE_EVENT, onSave)
    return () => window.removeEventListener(DESK_SAVE_EVENT, onSave)
  }, [updateStudent])

  useEffect(() => {
    return () => {
      const next = draftRef.current
      const current = studentRef.current
      if (next !== committedRef.current) {
        updateStudent(current.id, {
          notes: next,
          deskLocks: { ...current.deskLocks, notes: true },
        })
      }
    }
  }, [updateStudent])

  const dirty = draft !== student.notes

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl">Staff notes</h2>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            commitToStore()
            const ok = saveDesk()
            setJustSaved(true)
            window.setTimeout(() => setJustSaved(false), 2500)
            if (ok) toast.success("Notes saved on this desk")
            else toast.error("Could not save notes in this browser")
          }}
        >
          {dirty ? "Save notes" : justSaved || student.deskLocks?.notes ? "Notes saved" : "Save notes"}
        </Button>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setJustSaved(false)
        }}
        rows={8}
        placeholder="Payment history, parent contacts, absences…"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {dirty
          ? "Unsaved notes — tap Save notes, or wait for the 5-minute auto-save."
          : student.deskLocks?.notes
            ? "Saved on this desk. These notes stay on the website."
            : "Tap Save notes to keep this text on the website."}
      </p>
    </div>
  )
}
