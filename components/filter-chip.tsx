import { cn } from "@/lib/utils"

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/16 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-14 shrink-0 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
