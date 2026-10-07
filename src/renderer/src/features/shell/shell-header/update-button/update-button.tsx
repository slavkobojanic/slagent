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
      size="sm"
      className="mr-1 bg-info text-white hover:bg-info/90"
      title="Restart to install the update"
      disabled={installing}
      onClick={onInstall}
    >
      Update available (v{version})
    </Button>
  )
}
