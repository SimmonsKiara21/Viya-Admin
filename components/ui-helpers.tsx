import { cn } from "@/lib/utils"

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  )
}

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm", className)}>
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-5 shadow-[0_1px_0_oklch(1_0_0/0.04)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-medium tracking-[0.22em] text-[oklch(0.78_0.08_85)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-4xl tracking-tight text-balance md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-heading text-2xl">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
