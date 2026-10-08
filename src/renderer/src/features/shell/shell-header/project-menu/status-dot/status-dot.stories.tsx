import type { Meta, StoryObj } from "@storybook/react-vite"
import { StatusDot } from "@/features/shell/shell-header/project-menu/status-dot/status-dot"

const meta = {
  title: "Features/Shell/StatusDot",
  component: StatusDot,
} satisfies Meta<typeof StatusDot>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = { args: { status: "idle" } }

export const Running: Story = { args: { status: "running" } }

export const Done: Story = { args: { status: "done" } }
