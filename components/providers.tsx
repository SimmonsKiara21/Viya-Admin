"use client"

import { ThemeProvider } from "next-themes"
import { StoreProvider } from "@/lib/store"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/app-shell"
import { DeskGate } from "@/components/desk-gate"
import { ThemeToggle } from "@/components/theme-toggle"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["dark", "sepia", "light"]}>
      <StoreProvider>
        <TooltipProvider>
          <DeskGate>
            <AppShell>{children}</AppShell>
          </DeskGate>
          <ThemeToggle />
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </ThemeProvider>
  )
}
