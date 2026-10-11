import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Terminal } from "@/features/terminal/terminal"

const surface = (label: string, key: string) => (
  <div key={key} className="terminal-surface absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
    {label}
  </div>
)

const meta = {
  title: "Features/Terminal/Terminal",
  component: Terminal,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    height: 288,
    resizing: false,
    panes: [{ id: "a", groupId: null, surface: surface("zsh", "a") }],
    hiddenSurfaces: [],
    splitRatio: () => 0.5,
    error: null,
    onPaneSelect: fn(),
    onMenuSplit: fn(),
    onMenuRename: fn(),
    onMenuClose: fn(),
    onDividerStart: fn(),
    onResizeStart: fn(),
    onResizeReset: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex h-96 flex-col justify-end bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Terminal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Closed: Story = { args: { open: false } }

export const Starting: Story = { args: { panes: [] } }

export const Failed: Story = { args: { panes: [], error: "spawn /bin/zsh ENOENT" } }

export const Resizing: Story = { args: { resizing: true } }

export const Split: Story = {
  args: {
    panes: [
      { id: "a", groupId: "g1", surface: surface("zsh", "a") },
      { id: "b", groupId: "g1", surface: surface("node", "b") },
    ],
  },
}
