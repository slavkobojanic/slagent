import { useState } from "react"
import { toast } from "sonner"
import type { OpenRouterStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorText, openRouterLabel } from "@/lib/format"

const KEYS_URL = "https://openrouter.ai/keys"

function SettingsDialog({
  open,
  onOpenChange,
  status,
  authFile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: OpenRouterStatus
  authFile: string
}) {
  const [apiKey, setApiKey] = useState("")
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  let inputType = "password"
  if (visible) inputType = "text"

  let saveLabel = "Save key"
  if (saving) saveLabel = "Saving"
  let visibilityLabel = "Show key"
  if (visible) visibilityLabel = "Hide key"

  const canRemove = status.configured && status.source !== "OPENROUTER_API_KEY"
  let removeLabel = "Remove saved key"
  if (status.type === "oauth") removeLabel = "Sign out"
  if (removing) removeLabel = "Removing"

  async function save() {
    setSaving(true)
    try {
      await window.slagent.saveOpenRouterKey(apiKey)
      setApiKey("")
      toast.success("OpenRouter key saved")
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      await window.slagent.logoutOpenRouter()
      toast.success("OpenRouter credential removed")
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OpenRouter</DialogTitle>
          <DialogDescription>
            slagent runs on Pi and uses Pi&apos;s OpenRouter credentials.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm">
          Status: <span className="text-white/70">{openRouterLabel(status)}</span>
        </p>
        {status.type === "oauth" ? (
          <p className="mt-2 text-sm text-white/60">
            Saving a key replaces the OpenRouter sign-in stored for Pi.
          </p>
        ) : null}
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="openrouter-key">API key</Label>
            <Input
              id="openrouter-key"
              type={inputType}
              value={apiKey}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-or-..."
              onChange={(event) => setApiKey(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="text-sm text-white/60 underline-offset-2 hover:text-white hover:underline"
            onClick={() => setVisible(!visible)}
          >
            {visibilityLabel}
          </button>
          <p className="font-mono text-xs break-all text-white/40">{authFile}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => void window.slagent.openExternal(KEYS_URL)}
            >
              Create a key
            </Button>
            <Button type="submit" disabled={saving || apiKey.trim().length === 0}>
              {saveLabel}
            </Button>
            {canRemove ? (
              <Button type="button" variant="outline" disabled={removing} onClick={() => void remove()}>
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { SettingsDialog }
