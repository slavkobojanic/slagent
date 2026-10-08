import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { AccessibilityStep } from "@/features/permissions-wizard/accessibility-step/accessibility-step"

const meta = {
  title: "Features/PermissionsWizard/AccessibilityStep",
  component: AccessibilityStep,
  args: { pane: "Accessibility", error: null, canAllow: true, onOpenSettings: fn(), onAllow: fn() },
} satisfies Meta<typeof AccessibilityStep>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checking: Story = { args: { canAllow: false } }

export const Error: Story = { args: { error: "Could not read the permission state." } }
