import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { FileInput } from "@/features/composer/attachments/file-input/file-input"

const meta = {
  title: "Features/Composer/FileInput",
  component: FileInput,
  args: { attach: fn(), onChange: fn() },
} satisfies Meta<typeof FileInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
