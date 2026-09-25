"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { toast, useSonner } from "sonner"
import { cn } from "@/lib/utils"

const THEMES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const

export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const { theme, setTheme } = useTheme()
  const { toasts } = useSonner()
  const open = toasts.filter((item) => !item.delete).length

  useEffect(() => {
    if (theme === "sepia") setTheme("dark")
  }, [theme, setTheme])

  if (!mounted) return null

  return (
    <div className="fixed right-4 bottom-4 z-[80] flex items-center gap-2">
      {open > 0 ? (
        <button
          type="button"
          onClick={() => toast.dismiss()}
          className="rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md hover:bg-muted"
        >
          Clear all
        </button>
      ) : null}
      <div className="flex gap-0.5 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md">
        {THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTheme(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              theme === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
