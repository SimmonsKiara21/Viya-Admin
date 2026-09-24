"use client"

import { useEffect } from "react"
import { Redo2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("input, textarea, select, [contenteditable=true]"))
}

export function UndoRedoButtons() {
  const { canUndo, canRedo, undoDesk, redoDesk, ready } = useStore()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const redo = key === "y" || (key === "z" && event.shiftKey)
      const undo = key === "z" && !event.shiftKey
      if (!undo && !redo) return
      event.preventDefault()
      if (undo) {
        if (undoDesk()) toast.message("Undid last change")
        return
      }
      if (redoDesk()) toast.message("Redid last change")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undoDesk, redoDesk])

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!ready || !canUndo}
        onClick={() => {
          if (undoDesk()) toast.message("Undid last change")
        }}
      >
        <Undo2 />
        <span className="hidden sm:inline">Undo</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!ready || !canRedo}
        onClick={() => {
          if (redoDesk()) toast.message("Redid last change")
        }}
      >
        <Redo2 />
        <span className="hidden sm:inline">Redo</span>
      </Button>
    </div>
  )
}
