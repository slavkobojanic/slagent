import type { Meta, StoryObj } from "@storybook/react-vite"
import { TodoIcon } from "@/features/composer/run-status/todos/todo-icon/todo-icon"

const meta = {
  title: "Features/Composer/TodoIcon",
  component: TodoIcon,
  args: { status: "pending", label: "Pending", spinning: false },
} satisfies Meta<typeof TodoIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {}

export const InProgress: Story = { args: { status: "in_progress", label: "In progress" } }

export const InProgressSpinning: Story = { args: { status: "in_progress", label: "In progress", spinning: true } }

export const Completed: Story = { args: { status: "completed", label: "Done" } }
