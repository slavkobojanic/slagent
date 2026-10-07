import { Button } from "@/components/ui/button"

export type StepActionsProps = {
  pane: string
  canAllow: boolean
  onOpenSettings: () => void
  onAllow: () => void
}

export function StepActions({ pane, canAllow, onOpenSettings, onAllow }: StepActionsProps) {
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
