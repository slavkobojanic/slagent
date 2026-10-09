import type { Meta, StoryObj } from "@storybook/react-vite"
import { StatusDot } from "@/features/library/sidebar/status-dot/status-dot"

const meta = {
  title: "Features/Library/StatusDot",
  component: StatusDot,
} satisfies Meta<typeof StatusDot>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = { args: { status: "idle" } }

export const Running: Story = { args: { status: "running" } }

export const Waiting: Story = { args: { status: "waiting" } }

export const Done: Story = { args: { status: "done" } }

export const Error: Story = { args: { status: "error" } }
