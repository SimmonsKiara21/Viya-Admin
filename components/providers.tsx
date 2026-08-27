"use client"

import { StoreProvider } from "@/lib/store"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/app-shell"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider>
        <AppShell>{children}</AppShell>
        <Toaster />
      </TooltipProvider>
    </StoreProvider>
  )
}
