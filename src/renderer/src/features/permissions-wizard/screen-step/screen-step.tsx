import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StepActions } from "@/features/permissions-wizard/step-actions/step-actions"
import { StepError } from "@/features/permissions-wizard/step-error/step-error"

export type ScreenStepProps = {
  pane: string
  error: string | null
  canAllow: boolean
  onOpenSettings: () => void
  onAllow: () => void
}

export function ScreenStep({ pane, error, canAllow, onOpenSettings, onAllow }: ScreenStepProps) {
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
