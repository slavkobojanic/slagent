import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { NameChip } from "@/features/composer/attachments/name-chip/name-chip"

const meta = {
  title: "Features/Composer/NameChip",
  component: NameChip,
  args: { name: "src/shared/types.ts", onRemove: fn() },
} satisfies Meta<typeof NameChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
