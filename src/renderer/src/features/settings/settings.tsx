import type { ComponentType } from "react"
import { Info, Plug, Radio, Settings2, Sparkles, SquareTerminal, type LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SettingsTab } from "@/features/settings/settings-tab"

export type SettingsProps = {
  open: boolean
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  onOpenChange: (open: boolean) => void
  ThemePicker: ComponentType
  OpenRouterKey: ComponentType
  TitleModel: ComponentType
  ProviderRouting: ComponentType
  PersonalisationSettings: ComponentType
  McpSettings: ComponentType
  CliSettings: ComponentType
  About: ComponentType
  ConnectSettings: ComponentType
}

const TABS: { value: SettingsTab; label: string; icon: LucideIcon }[] = [
  { value: "general", label: "General", icon: Settings2 },
  { value: "personalisation", label: "Personalisation", icon: Sparkles },
  { value: "connect", label: "Connect", icon: Radio },
  { value: "mcp", label: "MCP", icon: Plug },
  { value: "cli", label: "CLI", icon: SquareTerminal },
  { value: "about", label: "About", icon: Info },
]

export function Settings({
  open,
  tab,
  onTabChange,
  onOpenChange,
  ThemePicker,
  OpenRouterKey,
  TitleModel,
  ProviderRouting,
  PersonalisationSettings,
  McpSettings,
  CliSettings,
  About,
  ConnectSettings,
}: SettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="fixed inset-0 z-50 bg-background/25 backdrop-blur-md" className="flex h-1/2 w-1/2 min-w-settings flex-col p-0">
        {/* Radix needs a title in the content; the tab labels say the rest. */}
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <nav aria-label="Settings sections" className="w-40 shrink-0 space-y-1 border-r border-white/10 p-2 max-md:w-12">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-current={tab === item.value ? "page" : undefined}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-white/60 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white not-aria-[current=page]:hover:bg-white/5 max-md:justify-center max-md:px-0"
                  title={item.label}
                  onClick={() => onTabChange(item.value)}
                >
                  <Icon className="size-4 shrink-0" />
                  {/* sr-only keeps the button's accessible name once the sidebar is icon only. */}
                  <span className="max-md:sr-only">{item.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="min-w-0 flex-1 overflow-y-auto p-5 pt-12">
            {tab === "general" ? (
              <div className="space-y-6">
                <ThemePicker />
                <OpenRouterKey />
                <TitleModel />
                <ProviderRouting />
              </div>
            ) : null}
            {tab === "personalisation" ? <PersonalisationSettings /> : null}
            {tab === "mcp" ? <McpSettings /> : null}
            {tab === "cli" ? <CliSettings /> : null}
            {tab === "about" ? <About /> : null}
            {tab === "connect" ? <ConnectSettings /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
