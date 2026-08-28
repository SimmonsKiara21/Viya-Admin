"use client"

import { StoreProvider } from "@/lib/store"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/app-shell"
import { DeskGate } from "@/components/desk-gate"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider>
        <DeskGate>
          <AppShell>{children}</AppShell>
        </DeskGate>
        <Toaster />
      </TooltipProvider>
    </StoreProvider>
  )
}
