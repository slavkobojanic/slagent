import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { InstallCommand } from "@/features/settings/cli-settings/install-command/install-command"

const meta = {
  title: "Features/Settings/InstallCommand",
  component: InstallCommand,
  args: { visible: true, canInstall: true, installing: false, label: "Install command", onInstall: fn() },
} satisfies Meta<typeof InstallCommand>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Update: Story = { args: { label: "Update command" } }

export const Installing: Story = { args: { installing: true } }

export const Disabled: Story = { args: { canInstall: false } }

export const Hidden: Story = { args: { visible: false } }
