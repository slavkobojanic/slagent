import type { Meta, StoryObj } from "@storybook/react-vite"
import { CliSettings } from "@/features/settings/cli-settings/cli-settings"
import { cli } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Settings/CliSettings",
  component: CliSettings,
  args: { status: cli(), error: null, InstallCommand: slot("InstallCommand"), UninstallCommand: slot("UninstallCommand") },
} satisfies Meta<typeof CliSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Installed: Story = {}

export const Missing: Story = { args: { status: cli({ state: "missing" }) } }

export const Outdated: Story = { args: { status: cli({ state: "outdated" }) } }

export const Conflict: Story = { args: { status: cli({ state: "conflict", path: "/usr/local/bin/slagent" }) } }

export const Unsupported: Story = { args: { status: cli({ state: "unsupported" }) } }

export const Loading: Story = { args: { status: null } }

export const Error: Story = { args: { error: "Could not install the command." } }
