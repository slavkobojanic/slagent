import type { ComponentType } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export type PermissionsWizardProps = {
  open: boolean
  step: "accessibility" | "screen"
  AccessibilityStep: ComponentType
  ScreenStep: ComponentType
}

// The wizard cannot be dismissed, so Escape and outside clicks are ignored.
export function PermissionsWizard({ open, step, AccessibilityStep, ScreenStep }: PermissionsWizardProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        hideClose
        overlayClassName="fixed inset-0 z-50 bg-background/25 backdrop-blur-md"
        onEscapeKeyDown={keepOpen}
        onPointerDownOutside={keepOpen}
        onInteractOutside={keepOpen}
      >
        <div className="mb-5 flex gap-1" aria-hidden="true">
          <span data-active={step === "accessibility"} className="h-0.5 flex-1 rounded-full bg-foreground/20 data-[active=true]:bg-foreground" />
          <span data-active={step === "screen"} className="h-0.5 flex-1 rounded-full bg-foreground/20 data-[active=true]:bg-foreground" />
        </div>
        {step === "accessibility" ? <AccessibilityStep /> : <ScreenStep />}
      </DialogContent>
    </Dialog>
  )
}

function keepOpen(event: { preventDefault: () => void }) {
  event.preventDefault()
}
