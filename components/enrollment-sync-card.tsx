"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/ui-helpers"
import { useSync } from "@/lib/store"

export function EnrollmentSyncCard() {
  const { enrollment } = useSync()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.set("file", file)
      const res = await fetch("/api/enrollment", { method: "POST", body: form })
      const payload = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(payload.error || "Could not sync that enrollment file.")
      toast.success(payload.message || "Enrollment doc synced.")
      window.dispatchEvent(new Event("focus"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrollment upload failed.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <Panel className="mb-6">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">Enrollment doc</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {enrollment.message || "Upload the latest enrollment export whenever the workbook changes."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Syncing…" : "Upload latest enrollment"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <p className="text-xs text-muted-foreground">
          CSV or Excel. A published Google Sheet with ENROLLMENT_CSV_URL also pulls automatically.
        </p>
      </div>
    </Panel>
  )
}
