import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type UpdateButtonProps = {
  // The version of an update waiting to install, or null.
  version: string | null
  installing: boolean
  onInstall: () => void
}

export function UpdateButton({ version, installing, onInstall }: UpdateButtonProps) {
  if (version === null) {
    return null
  }
  return (
    <Button
      type="button"
      size="xs"
      className="mr-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
      title="Restart to install the update"
      disabled={installing}
      onClick={onInstall}
    >
      <DownloadIcon />
      Update available (v{version})
    </Button>
  )
}
