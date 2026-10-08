import type { Meta, StoryObj } from "@storybook/react-vite"
import { PermissionsWizard } from "@/features/permissions-wizard/permissions-wizard"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/PermissionsWizard/PermissionsWizard",
  component: PermissionsWizard,
  args: { open: true, step: "accessibility", AccessibilityStep: slot("AccessibilityStep"), ScreenStep: slot("ScreenStep") },
} satisfies Meta<typeof PermissionsWizard>

export default meta
type Story = StoryObj<typeof meta>

export const Accessibility: Story = {}

export const Screen: Story = { args: { step: "screen" } }

export const Granted: Story = { args: { open: false } }
