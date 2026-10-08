import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { UninstallCommand } from "@/features/settings/cli-settings/uninstall-command/uninstall-command"

const meta = {
  title: "Features/Settings/UninstallCommand",
  component: UninstallCommand,
  args: { visible: true, canUninstall: true, label: "Remove command", onUninstall: fn() },
} satisfies Meta<typeof UninstallCommand>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Removing: Story = { args: { label: "Removing" } }

export const Hidden: Story = { args: { visible: false } }
