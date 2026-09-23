"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { displayStudentId, parseStudentId } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { Student } from "@/lib/types"

export function StudentIdField({
  student,
  onChanged,
}: {
  student: Student
  onChanged?: (id: string) => void
}) {
  const { changeStudentId } = useStore()
  const current = displayStudentId(student.id)
  const [value, setValue] = useState(current)
  const [error, setError] = useState("")

  useEffect(() => {
    setValue(displayStudentId(student.id))
    setError("")
  }, [student.id])

  const next = parseStudentId(value)
  const dirty = Boolean(value.trim()) && next !== current

  function save() {
    setError("")
    if (!value.trim()) {
      setValue(current)
      return
    }
    if (!next) {
      setError("Use numbers only — same ID as Square.")
      return
    }
    if (next === current || next === student.id) {
      setValue(current)
      return
    }
    const result = changeStudentId(student.id, next)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const saved = displayStudentId(result.id)
    setValue(saved)
    toast.success(`Student ID saved as #${saved}.`)
    onChanged?.(result.id)
  }

  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase">Student ID</dt>
      <dd>
        <div className="mt-1 flex items-center gap-2">
          <Input
            inputMode="numeric"
            autoComplete="off"
            placeholder="Add from Square"
            className="h-8 w-32"
            value={value}
            onChange={(e) => {
              setError("")
              setValue(e.target.value)
            }}
            onBlur={() => {
              if (dirty) save()
              else setValue(current)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                save()
              }
              if (e.key === "Escape") {
                setValue(current)
                setError("")
              }
            }}
          />
          {dirty ? (
            <Button type="button" size="sm" className="h-8" onMouseDown={(e) => e.preventDefault()} onClick={save}>
              Save
            </Button>
          ) : null}
        </div>
        {error ? <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
      </dd>
    </div>
  )
}
