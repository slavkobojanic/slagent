import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { TerminalTab } from "@/features/terminal/terminal-tab/terminal-tab"

const meta = {
  title: "Features/Terminal/TerminalTab",
  component: TerminalTab,
  args: { title: "zsh", active: false, exited: false, origin: "user", color: null, onSelect: fn(), onClose: fn() },
  render: (args) => (
    <div className="flex items-center gap-1 rounded-md bg-background p-2">
      <TerminalTab {...args} />
    </div>
  ),
} satisfies Meta<typeof TerminalTab>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { active: true } }

export const Exited: Story = { args: { title: "bash", exited: true } }

export const Task: Story = { args: { title: "dev server", origin: "task", color: "#3b82f6" } }
