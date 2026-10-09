// The icon and colour catalog a user picks from for a project. Pure data: the
// main process validates against it and the renderer maps icon ids to components.

export type ProjectIcon = {
  id: string
  label: string
}

export type ProjectColor = {
  id: string
  label: string
  // A hex colour readable on both themes, used on icons, terminal tabs and the status bar.
  value: string
}

export const PROJECT_ICONS: ProjectIcon[] = [
  { id: "folder", label: "Folder" },
  { id: "code", label: "Code" },
  { id: "terminal", label: "Terminal" },
  { id: "server", label: "Server" },
  { id: "database", label: "Database" },
  { id: "globe", label: "Web" },
  { id: "package", label: "Package" },
  { id: "rocket", label: "Launch" },
  { id: "flask", label: "Experiment" },
  { id: "book", label: "Docs" },
  { id: "layers", label: "Layers" },
  { id: "cpu", label: "Hardware" },
  { id: "brain", label: "AI" },
  { id: "game", label: "Game" },
  { id: "music", label: "Music" },
  { id: "camera", label: "Media" },
]

export const PROJECT_COLORS: ProjectColor[] = [
  { id: "red", label: "Red", value: "#ef4444" },
  { id: "orange", label: "Orange", value: "#f97316" },
  { id: "amber", label: "Amber", value: "#f59e0b" },
  { id: "yellow", label: "Yellow", value: "#eab308" },
  { id: "lime", label: "Lime", value: "#84cc16" },
  { id: "green", label: "Green", value: "#22c55e" },
  { id: "emerald", label: "Emerald", value: "#10b981" },
  { id: "teal", label: "Teal", value: "#14b8a6" },
  { id: "cyan", label: "Cyan", value: "#06b6d4" },
  { id: "blue", label: "Blue", value: "#3b82f6" },
  { id: "indigo", label: "Indigo", value: "#6366f1" },
  { id: "violet", label: "Violet", value: "#8b5cf6" },
  { id: "purple", label: "Purple", value: "#a855f7" },
  { id: "pink", label: "Pink", value: "#ec4899" },
  { id: "rose", label: "Rose", value: "#f43f5e" },
]

// The hex for a stored colour id, or null when the project has no colour.
export function projectColorValue(colorId: string | undefined): string | null {
  if (colorId === undefined) return null
  return PROJECT_COLORS.find((color) => color.id === colorId)?.value ?? null
}
