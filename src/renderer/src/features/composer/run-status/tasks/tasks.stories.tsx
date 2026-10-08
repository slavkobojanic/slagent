import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { TaskStrip } from "@/features/composer/run-status/tasks/tasks"

const meta = {
  title: "Features/Composer/TaskStrip",
  component: TaskStrip,
  args: {
    chips: [
      { id: "t1", label: "Run tests", command: "pnpm test", status: "running", statusText: "12s" },
      { id: "t2", label: "Typecheck", command: "pnpm typecheck", status: "done", statusText: "done" },
      { id: "t3", label: "Build", command: "pnpm build", status: "failed", statusText: "exit 1" },
    ],
    error: null,
    viewing: null,
    output: "",
    onOpen: fn(),
    onStop: fn(),
    onClose: fn(),
    bindBottom: fn(),
  },
} satisfies Meta<typeof TaskStrip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { chips: [] } }

export const Error: Story = { args: { error: "Could not stop the task." } }

export const DialogOpen: Story = {
  args: {
    chips: [],
    viewing: { label: "Run tests", command: "pnpm test", statusText: "running" },
    output: "PASS src/renderer/src/components/ui/button.test.tsx\nTests: 42 passed",
  },
}
