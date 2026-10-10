import { cn } from "@/lib/utils"
import type { TabletTab } from "@/features/mobile/tablet-shell/tablet-tab"
import "@/features/mobile/mobile.css"

export type TabletTabsProps = {
  tabs: Array<{ id: TabletTab; label: string }>
  active: TabletTab
  // A count or dot on a tab: the diff's changed files, a pending plan.
  badges: Partial<Record<TabletTab, string>>
  // Portrait's strip sits at the top edge, so it clears the status bar; the docked panel's does not.
  safeTop: boolean
  onSelect: (tab: TabletTab) => void
}

export function TabletTabs({ tabs, active, badges, safeTop, onSelect }: TabletTabsProps) {
  return (
    <div className={cn("shrink-0 border-b border-border bg-background", safeTop && "mobile-safe-top")}>
      <div role="tablist" className="flex h-11 items-stretch gap-1 px-2">
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "mobile-press relative flex flex-1 items-center justify-center gap-1.5 text-sm font-medium transition-colors",
                selected ? "text-foreground" : "text-foreground/50",
              )}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
              {badges[tab.id] !== undefined ? (
                <span className="min-w-4 rounded-full bg-foreground px-1 text-center text-xs font-semibold leading-4 text-background">{badges[tab.id]}</span>
              ) : null}
              {selected ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-foreground" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
