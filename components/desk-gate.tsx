"use client"

import { useState, useSyncExternalStore } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DESK_PASSWORD, DESK_UNLOCK_KEY } from "@/lib/constants"

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function isUnlocked() {
  try {
    return sessionStorage.getItem(DESK_UNLOCK_KEY) === "1"
  } catch {
    return false
  }
}

export function lockDesk() {
  try {
    sessionStorage.removeItem(DESK_UNLOCK_KEY)
  } catch {
    /* ignore */
  }
  emit()
}

function unlockDesk() {
  try {
    sessionStorage.setItem(DESK_UNLOCK_KEY, "1")
  } catch {
    /* private mode */
  }
  emit()
}

export function DeskGate({ children }: { children: React.ReactNode }) {
  const unlocked = useSyncExternalStore(subscribe, isUnlocked, () => false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (password.trim() !== DESK_PASSWORD) {
      setError("That password does not unlock the desk.")
      return
    }
    setError("")
    setPassword("")
    unlockDesk()
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[oklch(0.12_0.02_75)] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[oklch(0.78_0.08_85/0.22)] bg-[oklch(0.16_0.02_75)] p-8 shadow-[0_24px_80px_oklch(0_0_0/0.45)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[oklch(0.78_0.08_85/0.4)] bg-[oklch(0.78_0.08_85/0.12)]">
            <Lock className="size-6 text-[oklch(0.86_0.07_85)]" />
          </div>
          <p className="mt-6 text-center text-[11px] font-medium tracking-[0.32em] text-[oklch(0.78_0.08_85)] uppercase">
            Viya Academy + Agency
          </p>
          <h1 className="mt-2 text-center font-heading text-5xl tracking-[0.18em] text-[oklch(0.9_0.05_85)]">
            VIYA
          </h1>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Staff desk is locked. Enter the password to open the roster, Square tracker, and
            DocuSign files.
          </p>
          <form onSubmit={onSubmit} className="mt-8 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Password
              </span>
              <Input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError("")
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Desk password"
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <Button type="submit" className="h-11 w-full">
              Unlock desk
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
