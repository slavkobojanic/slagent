import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { UpdateButton } from "@/features/shell/shell-header/update-button/update-button"

const meta = {
  title: "Features/Shell/UpdateButton",
  component: UpdateButton,
  args: { version: "0.1.7", installing: false, onInstall: fn() },
} satisfies Meta<typeof UpdateButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Installing: Story = { args: { installing: true } }

export const NoUpdate: Story = { args: { version: null } }
