import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ImageChip } from "@/features/composer/attachments/image-chip/image-chip"

const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%23333333'/%3E%3C/svg%3E"

const meta = {
  title: "Features/Composer/ImageChip",
  component: ImageChip,
  args: { name: "screenshot.png", url: IMAGE, onRemove: fn() },
} satisfies Meta<typeof ImageChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
