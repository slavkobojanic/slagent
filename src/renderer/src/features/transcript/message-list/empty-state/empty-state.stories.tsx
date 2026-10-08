import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EmptyState } from "@/features/transcript/message-list/empty-state/empty-state"

const meta = {
  title: "Features/Transcript/EmptyState",
  component: EmptyState,
  args: { configured: true, cwd: "/work/slagent", onConnect: fn(), onChoose: fn(), onNewChat: fn() },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const NoFolder: Story = { args: { cwd: "" } }

export const NotConnected: Story = { args: { configured: false } }
