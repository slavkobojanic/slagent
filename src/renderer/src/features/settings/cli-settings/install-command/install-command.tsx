import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export type InstallCommandProps = {
  visible: boolean
  canInstall: boolean
  installing: boolean
  label: string
  onInstall: () => void
}

export function InstallCommand({ visible, canInstall, installing, label, onInstall }: InstallCommandProps) {
  if (!visible) {
    return null
  }

  return (
    <Button type="button" disabled={!canInstall} onClick={onInstall}>
      {installing ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {label}
    </Button>
  )
}
