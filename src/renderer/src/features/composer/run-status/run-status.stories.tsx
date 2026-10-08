import type { Meta, StoryObj } from "@storybook/react-vite"
import { RunStatus } from "@/features/composer/run-status/run-status"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Composer/RunStatus",
  component: RunStatus,
  args: { Tasks: slot("Tasks"), Todos: slot("Todos"), Queue: slot("Queue") },
} satisfies Meta<typeof RunStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
