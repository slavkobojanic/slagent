import { Button } from "@/components/ui/button"

export type UninstallCommandProps = {
  visible: boolean
  canUninstall: boolean
  label: string
  onUninstall: () => void
}

export function UninstallCommand({ visible, canUninstall, label, onUninstall }: UninstallCommandProps) {
  if (!visible) {
    return null
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="ml-auto text-white/50 hover:text-destructive"
      disabled={!canUninstall}
      onClick={onUninstall}
    >
      {label}
    </Button>
  )
}
