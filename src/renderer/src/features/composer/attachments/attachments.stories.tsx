import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Attachments } from "@/features/composer/attachments/attachments"

const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%23333333'/%3E%3C/svg%3E"

const meta = {
  title: "Features/Composer/Attachments",
  component: Attachments,
  args: {
    items: [
      { id: "a1", name: "screenshot.png", imageUrl: IMAGE },
      { id: "a2", name: "types.ts", imageUrl: null },
    ],
    onRemove: fn(),
  },
} satisfies Meta<typeof Attachments>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { items: [] } }
