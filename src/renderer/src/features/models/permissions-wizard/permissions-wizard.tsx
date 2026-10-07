import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type PermissionsWizardProps = {
  open: boolean
  step: "accessibility" | "screen"
  accessibilityPane: string
  screenPane: string
  error: string | null
  canAllowAccessibility: boolean
  canAllowScreenRecording: boolean
  onOpenSettings: (pane: "accessibility" | "screen") => void
  onAllowAccessibility: () => void
  onAllowScreenRecording: () => void
}

// Two steps, shown until both permissions are granted. The wizard cannot be dismissed, so Escape
// and outside clicks are ignored.
export function PermissionsWizard({
  open,
  step,
  accessibilityPane,
  screenPane,
  error,
  canAllowAccessibility,
  canAllowScreenRecording,
  onOpenSettings,
  onAllowAccessibility,
  onAllowScreenRecording,
}: PermissionsWizardProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        hideClose
        overlayClassName="fixed inset-0 z-50 bg-background/25 backdrop-blur-xl"
        onEscapeKeyDown={keepOpen}
        onPointerDownOutside={keepOpen}
        onInteractOutside={keepOpen}
      >
        <div className="mb-5 flex gap-1" aria-hidden="true">
          <span data-active={step === "accessibility"} className="h-0.5 flex-1 rounded-full bg-foreground/20 data-[active=true]:bg-foreground" />
          <span data-active={step === "screen"} className="h-0.5 flex-1 rounded-full bg-foreground/20 data-[active=true]:bg-foreground" />
        </div>
        {step === "accessibility" ? (
          <AccessibilityStep
            pane={accessibilityPane}
            error={error}
            canAllow={canAllowAccessibility}
            onOpenSettings={() => onOpenSettings("accessibility")}
            onAllow={onAllowAccessibility}
          />
        ) : (
          <ScreenStep
            pane={screenPane}
            error={error}
            canAllow={canAllowScreenRecording}
            onOpenSettings={() => onOpenSettings("screen")}
            onAllow={onAllowScreenRecording}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function keepOpen(event: { preventDefault: () => void }) {
  event.preventDefault()
}

type StepProps = {
  pane: string
  error: string | null
  canAllow: boolean
  onOpenSettings: () => void
  onAllow: () => void
}

function AccessibilityStep({ pane, error, canAllow, onOpenSettings, onAllow }: StepProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Allow {pane}</DialogTitle>
        <DialogDescription>Step 1 of 2. slagent stays locked until this is allowed.</DialogDescription>
      </DialogHeader>
      <p className="text-sm leading-6 text-foreground/70">
        This lets slagent read buttons and type into other apps without taking over your cursor or your current window.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        If slagent is already listed under {pane}, turn that switch off and back on. macOS keeps the old switch after a
        rebuild and does not apply it until you do. This step closes when the grant is active.
      </p>
      <StepError error={error} />
      <StepActions canAllow={canAllow} pane={pane} onOpenSettings={onOpenSettings} onAllow={onAllow} />
    </>
  )
}

function ScreenStep({ pane, error, canAllow, onOpenSettings, onAllow }: StepProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Allow {pane}</DialogTitle>
        <DialogDescription>Step 2 of 2. slagent stays locked until this is allowed.</DialogDescription>
      </DialogHeader>
      <p className="text-sm leading-6 text-foreground/70">
        Screen recording lets slagent capture one window, so it can see the app it is using. The capture stays on that
        window.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        If slagent is already listed under {pane}, turn that switch off and back on. macOS keeps the old switch after a
        rebuild and does not apply it until you do. This step closes when the grant is active.
      </p>
      <StepError error={error} />
      <StepActions canAllow={canAllow} pane={pane} onOpenSettings={onOpenSettings} onAllow={onAllow} />
    </>
  )
}

function StepError({ error }: { error: string | null }) {
  if (error === null) {
    return null
  }
  return (
    <p role="alert" className="mt-3 text-sm text-destructive">
      {error}
    </p>
  )
}

type StepActionsProps = {
  pane: string
  canAllow: boolean
  onOpenSettings: () => void
  onAllow: () => void
}

function StepActions({ pane, canAllow, onOpenSettings, onAllow }: StepActionsProps) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" onClick={onOpenSettings}>
        Open Settings
      </Button>
      <Button type="button" disabled={!canAllow} onClick={() => onAllow()}>
        Allow {pane}
      </Button>
    </div>
  )
}
