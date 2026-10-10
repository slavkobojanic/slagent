// The tablet's content tabs. Chat is the centre pane; the rest are the right panel's tabs,
// which portrait folds into the same switcher.
export type TabletTab = "chat" | "changes" | "plan" | "file"

export const PANEL_TABS: Array<{ id: Exclude<TabletTab, "chat">; label: string }> = [
  { id: "changes", label: "Diff" },
  { id: "plan", label: "Plan" },
  { id: "file", label: "Source" },
]

export const PORTRAIT_TABS: Array<{ id: TabletTab; label: string }> = [{ id: "chat", label: "Chat" }, ...PANEL_TABS]
