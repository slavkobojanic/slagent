import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SettingsButton } from "@/features/shell/shell-header/settings-button/settings-button"

const meta = {
  title: "Features/Shell/SettingsButton",
  component: SettingsButton,
  args: { needsAuth: false, onOpen: fn() },
} satisfies Meta<typeof SettingsButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NeedsAuth: Story = { args: { needsAuth: true } }
