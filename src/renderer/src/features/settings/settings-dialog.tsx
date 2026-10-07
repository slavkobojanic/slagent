import type { ComponentType } from "react"
import { Plug, Settings2, Sparkles, SquareTerminal, type LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SettingsTab } from "@/features/settings/settings-tab"

export type SettingsDialogProps = {
  open: boolean
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  onOpenChange: (open: boolean) => void
  // Each section is a component the owner built. Only the active one is mounted.
  ThemePicker: ComponentType
  OpenRouterKey: ComponentType
  PersonalisationSettings: ComponentType
  McpSettings: ComponentType
  CliSettings: ComponentType
}

const TABS: { value: SettingsTab; label: string; icon: LucideIcon }[] = [
  { value: "general", label: "General", icon: Settings2 },
  { value: "personalisation", label: "Personalisation", icon: Sparkles },
  { value: "mcp", label: "MCP", icon: Plug },
  { value: "cli", label: "CLI", icon: SquareTerminal },
]

export function SettingsDialog({
  open,
  tab,
  onTabChange,
  onOpenChange,
  ThemePicker,
  OpenRouterKey,
  PersonalisationSettings,
  McpSettings,
  CliSettings,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent genieTo='[data-genie-target="settings"]' className="flex h-1/2 w-1/2 flex-col p-0">
        {/* Radix needs a title in the content; the tab labels say the rest. */}
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <nav aria-label="Settings sections" className="w-40 shrink-0 space-y-1 border-r border-white/10 p-2">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-current={tab === item.value ? "page" : undefined}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-white/60 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white not-aria-[current=page]:hover:bg-white/5"
                  onClick={() => onTabChange(item.value)}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="min-w-0 flex-1 overflow-y-auto p-5 pt-12">
            {tab === "general" ? (
              <div className="space-y-6">
                <ThemePicker />
                <OpenRouterKey />
              </div>
            ) : null}
            {tab === "personalisation" ? <PersonalisationSettings /> : null}
            {tab === "mcp" ? <McpSettings /> : null}
            {tab === "cli" ? <CliSettings /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
