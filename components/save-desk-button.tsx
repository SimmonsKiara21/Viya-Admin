"use client"

import { useEffect } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/format"
import { useStore } from "@/lib/store"

export function SaveDeskButton() {
  const { saveDesk, lastSavedAt, ready } = useStore()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return
      if (event.defaultPrevented) return
      event.preventDefault()
      const ok = saveDesk()
      if (ok) toast.success("Updates saved on this desk")
      else toast.error("Could not save in this browser")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [saveDesk])

  return (
    <div className="flex shrink-0 items-center gap-2">
      {lastSavedAt ? (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Saved {formatTime(lastSavedAt)}
        </span>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!ready}
        onClick={() => {
          const ok = saveDesk()
          if (ok) toast.success("Updates saved on this desk")
          else toast.error("Could not save in this browser")
        }}
      >
        <Save />
        Save updates
      </Button>
    </div>
  )
}
