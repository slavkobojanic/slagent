import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { MessageQueue } from "@/features/composer/run-status/queue/queue"

const meta = {
  title: "Features/Composer/MessageQueue",
  component: MessageQueue,
  args: {
    rows: [
      { id: "q1", content: "Also cover the empty states", switchLabel: "Steer instead", nextMode: "steer" },
      { id: "q2", content: "And add a dark-mode story", switchLabel: "Send as follow-up", nextMode: "follow-up" },
    ],
    error: null,
    onModeChange: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof MessageQueue>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { rows: [] } }

export const Error: Story = { args: { error: "Could not change the queue mode." } }
