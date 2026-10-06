import { useState } from "react"
import type { ComputerPermissions } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function PermissionsWizard({
  open,
  permissions,
  onRequestAccessibility,
  onRequestScreenRecording,
}: {
  open: boolean
  permissions: ComputerPermissions | null
  onRequestAccessibility: () => void
  onRequestScreenRecording: () => void
}) {
  const [busy, setBusy] = useState(false)
  const accessibility = permissions?.accessibility ?? false
  let step = 0
  if (accessibility) step = 1

  function keepOpen(event: { preventDefault: () => void }) {
    event.preventDefault()
  }

  async function allowAccessibility() {
    setBusy(true)
    try {
      await onRequestAccessibility()
    } finally {
      setBusy(false)
    }
  }

  async function allowScreen() {
    setBusy(true)
    try {
      await onRequestScreenRecording()
    } finally {
      setBusy(false)
    }
  }

  let body = (
    <>
      <DialogHeader>
        <DialogTitle>Allow screen recording</DialogTitle>
        <DialogDescription>Step 2 of 2. slagent stays locked until this is allowed.</DialogDescription>
      </DialogHeader>
      <p className="text-sm leading-6 text-white/70">
        Screen recording lets slagent capture one window, so it can see the app it is using. The capture stays on that
        window.
      </p>
      <p className="mt-3 text-sm text-white/50">
        The system prompt may say Electron while you are running from the terminal. Allow that app, then come back
        here.
      </p>
      {permissions?.error ? <p className="mt-3 text-sm text-[#ff5c5c]">{permissions.error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void window.slagent.openPermissionSettings("screen")}>
          Open Settings
        </Button>
        <Button type="button" disabled={busy} onClick={() => void allowScreen()}>
          Allow screen recording
        </Button>
      </div>
    </>
  )
  if (step === 0) {
    body = (
      <>
        <DialogHeader>
          <DialogTitle>Allow Accessibility</DialogTitle>
          <DialogDescription>Step 1 of 2. slagent stays locked until this is allowed.</DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-6 text-white/70">
          Accessibility lets slagent read buttons and type into other apps without taking over your cursor or your
          current window.
        </p>
        <p className="mt-3 text-sm text-white/50">
          The system prompt may say Electron while you are running from the terminal. Allow that app, then come back
          here.
        </p>
        {permissions?.error ? <p className="mt-3 text-sm text-[#ff5c5c]">{permissions.error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void window.slagent.openPermissionSettings("accessibility")}
          >
            Open Settings
          </Button>
          <Button type="button" disabled={busy || !permissions} onClick={() => void allowAccessibility()}>
            Allow Accessibility
          </Button>
        </div>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        hideClose
        overlayClassName="fixed inset-0 z-50 bg-black/25 backdrop-blur-xl"
        onEscapeKeyDown={keepOpen}
        onPointerDownOutside={keepOpen}
        onInteractOutside={keepOpen}
      >
        <div className="mb-5 flex gap-1" aria-hidden="true">
          <span className={cn("h-0.5 flex-1 rounded-full bg-white/20", step === 0 && "bg-white")} />
          <span className={cn("h-0.5 flex-1 rounded-full bg-white/20", step === 1 && "bg-white")} />
        </div>
        {body}
      </DialogContent>
    </Dialog>
  )
}

export { PermissionsWizard }
