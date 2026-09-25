"use client"

import { NativeSelect } from "@/components/ui-helpers"
import { COLOR_KEY } from "@/lib/color-key"
import { useStore } from "@/lib/store"
import type { ManualHighlight, Student } from "@/lib/types"

export function HighlightPicker({ student }: { student: Student }) {
  const { updateStudent } = useStore()
  return (
    <NativeSelect
      value={student.manualHighlight || "none"}
      onChange={(e) =>
        updateStudent(student.id, {
          manualHighlight: e.target.value as ManualHighlight,
          deskLocks: { ...student.deskLocks, highlight: e.target.value !== "none" },
        })
      }
    >
      <option value="none">Automatic</option>
      {COLOR_KEY.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </NativeSelect>
  )
}
