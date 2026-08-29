"use client"

import { useRef } from "react"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import { initials, portraitHue } from "@/lib/format"
import { compressPhoto } from "@/lib/photo"
import type { Student } from "@/lib/types"

export function StudentPhoto({
  student,
  size = "md",
  editable = false,
  onUpload,
  className,
}: {
  student: Pick<Student, "firstName" | "lastName" | "photoUrl">
  size?: "sm" | "md" | "lg" | "xl"
  editable?: boolean
  onUpload?: (dataUrl: string) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dims = {
    sm: "size-10 text-xs",
    md: "size-14 text-sm",
    lg: "size-24 text-2xl",
    xl: "size-40 text-4xl",
  }[size]
  const hue = portraitHue(`${student.firstName} ${student.lastName}`)
  const letters = initials(student)

  function onFile(file: File | undefined) {
    if (!file || !onUpload) return
    void compressPhoto(file)
      .then(onUpload)
      .catch(() => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") onUpload(reader.result)
        }
        reader.readAsDataURL(file)
      })
  }

  const inner = student.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={student.photoUrl}
      alt={`${student.firstName} ${student.lastName}`}
      className="size-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className="font-heading font-semibold tracking-wide">{letters}</span>
  )

  const frame = (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-[oklch(0.72_0.08_85/0.45)] shadow-[0_0_0_1px_oklch(0.3_0.02_75)]",
        dims,
        className,
      )}
      style={
        student.photoUrl
          ? undefined
          : {
              background: `linear-gradient(145deg, oklch(0.32 0.04 ${hue}), oklch(0.18 0.03 ${hue + 12}))`,
              color: "oklch(0.93 0.03 85)",
            }
      }
    >
      <div className="flex size-full items-center justify-center">{inner}</div>
      {editable ? (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <span className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white">
            <Camera className="size-3" /> Photo
          </span>
        </div>
      ) : null}
    </div>
  )

  if (!editable) return frame

  return (
    <button
      type="button"
      className="group relative cursor-pointer rounded-full text-left"
      onClick={() => inputRef.current?.click()}
      aria-label="Upload student photo"
    >
      {frame}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </button>
  )
}
