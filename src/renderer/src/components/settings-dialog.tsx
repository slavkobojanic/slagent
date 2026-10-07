import { useState } from "react"
import { toast } from "sonner"
import type { OpenRouterStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorText, openRouterLabel } from "@/lib/format"
import { setThemePreference, type ThemePreference, useThemePreference } from "@/lib/theme"
import { cn } from "@/lib/utils"

const KEYS_URL = "https://openrouter.ai/keys"
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

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
  const theme = useThemePreference()
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
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Appearance and model credentials.</DialogDescription>
        </DialogHeader>
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Theme</h2>
          <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border border-white/15 p-0.5">
            {THEMES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={theme === option.value}
                className={cn(
                  "rounded px-3 py-1 text-sm text-white/60 transition-colors hover:text-white",
                  theme === option.value && "bg-white/10 text-white",
                )}
                onClick={() => setThemePreference(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
        <h2 className="mt-6 border-t border-white/10 pt-4 text-sm font-medium">OpenRouter</h2>
        <p className="text-sm text-white/60">slagent runs on Pi and uses Pi&apos;s OpenRouter credentials.</p>
        <p className="text-sm">
          Status: <span className="text-white/70">{openRouterLabel(status)}</span>
        </p>
        {status.envKey ? (
          <p className="mt-2 text-sm text-white/60">
            Found <span className="font-mono text-white/80">OPENROUTER_API_KEY</span> in your environment. You don&apos;t
            need to save a key here.
          </p>
        ) : null}
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
