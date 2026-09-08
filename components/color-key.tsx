"use client"

import { useState } from "react"
import { COLOR_KEY } from "@/lib/color-key"
import { cn } from "@/lib/utils"

export function ColorKey({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("border-b border-border bg-muted/30 px-4 py-2", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
        >
          Color key{open ? " · hide" : ""}
        </button>
        {COLOR_KEY.map((item) => (
          <span key={item.id} className={cn("inline-flex items-center gap-1.5 text-xs font-medium leading-none", item.text)}>
            <span className={cn("size-2.5 shrink-0 rounded-full", item.swatch)} aria-hidden />
            {item.label}
          </span>
        ))}
      </div>
      {open ? (
        <dl className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_KEY.map((item) => (
            <div key={item.id} className="flex gap-2 text-xs">
              <dt className={cn("inline-flex shrink-0 items-center gap-1.5 font-medium", item.text)}>
                <span className={cn("size-2.5 rounded-full", item.swatch)} aria-hidden />
                {item.label}
              </dt>
              <dd className="text-muted-foreground">{item.meaning}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
