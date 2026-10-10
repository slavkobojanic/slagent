import type { ComponentType } from "react"
import type { TabletTab } from "@/features/mobile/tablet-shell/tablet-tab"

export type TabletPanelBodyProps = {
  active: TabletTab
  Diff: ComponentType
  Plan: ComponentType
  Source: ComponentType
}

// The right panel's content for one tab; landscape docks it, portrait shows it as the page.
export function TabletPanelBody({ active, Diff, Plan, Source }: TabletPanelBodyProps) {
  if (active === "plan") {
    return <Plan />
  }
  if (active === "file") {
    return <Source />
  }
  return <Diff />
}

export type TabletPanelProps = {
  Tabs: ComponentType
  Body: ComponentType
}

export function TabletPanel({ Tabs, Body }: TabletPanelProps) {
  return (
    <aside className="mobile-safe-top flex h-full flex-col border-l border-border bg-background text-foreground" aria-label="Side panel">
      <Tabs />
      <div className="mobile-safe-bottom flex min-h-0 flex-1 flex-col">
        <Body />
      </div>
    </aside>
  )
}
