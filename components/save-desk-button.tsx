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
    const onKey = async (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return
      if (event.defaultPrevented) return
      event.preventDefault()
      const ok = await saveDesk()
      if (ok.shared) toast.success("Saved for this computer, phones, and other desks")
      else if (ok.local) toast.error("Saved on this computer only. Phones still have the old list.")
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
        onClick={async () => {
          const ok = await saveDesk()
          if (ok.shared) toast.success("Saved for this computer, phones, and other desks")
          else if (ok.local) toast.error("Saved on this computer only. Phones still have the old list.")
          else toast.error("Could not save in this browser")
        }}
      >
        <Save />
        Save updates
      </Button>
    </div>
  )
}
