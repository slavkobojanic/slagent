import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Terminal } from "@/features/terminal/terminal"
import { TerminalTab } from "@/features/terminal/terminal-tab/terminal-tab"

const tabs = [
  <TerminalTab key="a" title="zsh" active exited={false} onSelect={fn()} onClose={fn()} />,
  <TerminalTab key="b" title="~/code/slagent" active={false} exited={false} onSelect={fn()} onClose={fn()} />,
]

const surfaces = [
  <div key="a" className="terminal-surface absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
    zsh
  </div>,
  <div key="b" className="terminal-surface invisible absolute inset-0" />,
]

const meta = {
  title: "Features/Terminal/Terminal",
  component: Terminal,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    height: 288,
    resizing: false,
    tabs,
    surfaces,
    empty: false,
    error: null,
    canCreate: true,
    onCreate: fn(),
    onClose: fn(),
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

export const Starting: Story = { args: { tabs: [], surfaces: [], empty: true } }

export const Failed: Story = { args: { tabs: [], surfaces: [], empty: true, error: "spawn /bin/zsh ENOENT" } }

export const Creating: Story = { args: { canCreate: false } }

export const Resizing: Story = { args: { resizing: true } }
