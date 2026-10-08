import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ScreenStep } from "@/features/permissions-wizard/screen-step/screen-step"

const meta = {
  title: "Features/PermissionsWizard/ScreenStep",
  component: ScreenStep,
  args: { pane: "Screen Recording", error: null, canAllow: true, onOpenSettings: fn(), onAllow: fn() },
} satisfies Meta<typeof ScreenStep>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checking: Story = { args: { canAllow: false } }

export const Error: Story = { args: { error: "Could not read the permission state." } }
