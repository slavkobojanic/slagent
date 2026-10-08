import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { TaskOutputDialog } from "@/features/composer/run-status/tasks/task-output-dialog/task-output-dialog"

const meta = {
  title: "Features/Composer/TaskOutputDialog",
  component: TaskOutputDialog,
  args: {
    task: { label: "Run tests", command: "pnpm test", statusText: "running" },
    output: "PASS src/renderer/src/components/ui/button.test.tsx\nTests: 42 passed\nTime: 3.1s",
    onClose: fn(),
    bindBottom: fn(),
  },
} satisfies Meta<typeof TaskOutputDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = { args: { task: null } }
