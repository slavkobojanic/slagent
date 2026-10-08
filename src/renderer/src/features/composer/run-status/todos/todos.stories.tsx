import type { Meta, StoryObj } from "@storybook/react-vite"
import { TodoPanel } from "@/features/composer/run-status/todos/todos"

const meta = {
  title: "Features/Composer/TodoPanel",
  component: TodoPanel,
  args: {
    panel: {
      countText: "3 todos",
      currentText: "Write stories for each component",
      rows: [
        { key: "1", text: "Install Storybook", status: "completed", iconLabel: "Done", spinning: false },
        { key: "2", text: "Write stories for each component", status: "in_progress", iconLabel: "In progress", spinning: true },
        { key: "3", text: "Commit", status: "pending", iconLabel: "Pending", spinning: false },
      ],
    },
  },
} satisfies Meta<typeof TodoPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Hidden: Story = { args: { panel: null } }

export const Stale: Story = {
  args: {
    panel: {
      countText: "1 todo",
      currentText: "Write stories for each component",
      rows: [{ key: "1", text: "Write stories for each component", status: "in_progress", iconLabel: "In progress", spinning: false }],
    },
  },
}
