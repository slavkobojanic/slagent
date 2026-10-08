import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { AttachButton } from "@/features/composer/attachments/attach-button/attach-button"

const meta = {
  title: "Features/Composer/AttachButton",
  component: AttachButton,
  args: { onAttach: fn() },
} satisfies Meta<typeof AttachButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
