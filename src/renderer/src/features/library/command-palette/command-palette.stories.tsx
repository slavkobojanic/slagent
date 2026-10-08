import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommandPalette } from "@/features/library/command-palette/command-palette"
import type { PaletteGroup } from "@/features/library/command-palette/palette-items"

const groups: PaletteGroup[] = [
  {
    heading: "Actions",
    items: [
      { id: "new", value: "new chat", label: "New chat", shortcut: "Cmd N", onSelect: fn() },
      { id: "settings", value: "open settings", label: "Open settings", shortcut: "Cmd ,", onSelect: fn() },
    ],
  },
  {
    heading: "Chats",
    items: [{ id: "c1", value: "storybook", label: "Set up storybook stories", detail: "slagent", onSelect: fn() }],
  },
  {
    heading: "Models",
    items: [{ id: "m1", value: "opus", label: "Claude Opus 4", detail: "openrouter", disabled: true, onSelect: fn() }],
  },
]

const meta = {
  title: "Features/Library/CommandPalette",
  component: CommandPalette,
  args: { open: true, query: "", groups, onOpenChange: fn(), onQueryChange: fn() },
} satisfies Meta<typeof CommandPalette>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { groups: [] } }

export const Closed: Story = { args: { open: false } }
