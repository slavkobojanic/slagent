import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { TerminalChip } from "@/features/terminal/terminal-bar/terminal-bar"
import { TerminalBar, type TerminalBarProps } from "@/features/terminal/terminal-bar/terminal-bar"

const userShell: TerminalChip = { id: "terminal-1", title: "~/projects/slagent", active: true, exited: false, running: false, origin: "user", color: "#3b82f6" }
const running: TerminalChip = { id: "task-1", title: "dev server", active: false, exited: false, running: true, origin: "task", color: "#3b82f6" }
const finished: TerminalChip = { id: "task-2", title: "tests", active: false, exited: true, running: false, origin: "task", color: "#3b82f6" }

function base(overrides: Partial<TerminalBarProps> = {}): TerminalBarProps {
  return {
    chips: [],
    open: false,
    canCreate: true,
    onSelect: fn(),
    onClose: fn(),
    onCreate: fn(),
    onToggle: fn(),
    ...overrides,
  }
}

const meta = {
  title: "Features/Terminal/TerminalBar",
  component: TerminalBar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-24 flex-col justify-end bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TerminalBar>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: base(),
}

export const WithTerminals: Story = {
  args: base({ chips: [userShell, running, finished] }),
}

export const WithDrawerOpen: Story = {
  args: base({ chips: [userShell, running], open: true }),
}

export const Spawning: Story = {
  args: base({ chips: [userShell], canCreate: false }),
}

export const WithBranch: Story = {
  args: base({ chips: [userShell], branch: <span className="font-mono text-white/40">feat-status-bar-and-project-appearance</span> }),
}
