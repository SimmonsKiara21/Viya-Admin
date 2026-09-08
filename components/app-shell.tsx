"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Camera,
  CreditCard,
  FilePenLine,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquare,
  Sparkles,
  Users,
  CalendarDays,
  Bell,
  Clock,
  BookUser,
} from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { StudentSearch } from "@/components/student-search"
import { StaffAlertBanner } from "@/components/staff-alert-banner"
import { ColorKey } from "@/components/color-key"
import { lockDesk } from "@/components/desk-gate"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/students", label: "Talent", icon: Users },
  { href: "/contacts", label: "Contacts", icon: BookUser },
  { href: "/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/classes", label: "Classes", icon: Clock },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/docusign", label: "DocuSign", icon: FilePenLine },
  { href: "/subscriptions", label: "Subscriptions", icon: Sparkles },
  { href: "/photoshoots", label: "Photoshoots", icon: Camera },
  { href: "/notify", label: "Notify", icon: MessageSquare },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/16 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/" className="block px-2 py-1">
      <p className="font-heading text-2xl leading-none tracking-[0.18em] text-primary">
        VIYA
      </p>
      <p className="mt-1 text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
        ViyaAdmin.com
      </p>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
          Staff only · Phoenix
        </p>
        <button
          type="button"
          onClick={lockDesk}
          className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Lock className="size-3.5" />
          Lock desk
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md">
          <Sheet>
            <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-lg md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar px-4 pt-8">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand />
              <div className="mt-8">
                <NavLinks />
              </div>
              <button
                type="button"
                onClick={lockDesk}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Lock className="size-3.5" />
                Lock desk
              </button>
            </SheetContent>
          </Sheet>
          <StudentSearch className="max-w-xl flex-1" />
        </header>
        <StaffAlertBanner />
        <ColorKey />
        <div className="flex-1 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  )
}
