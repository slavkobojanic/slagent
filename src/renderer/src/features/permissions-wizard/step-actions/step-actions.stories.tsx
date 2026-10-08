import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { StepActions } from "@/features/permissions-wizard/step-actions/step-actions"

const meta = {
  title: "Features/PermissionsWizard/StepActions",
  component: StepActions,
  args: { pane: "Accessibility", canAllow: true, onOpenSettings: fn(), onAllow: fn() },
} satisfies Meta<typeof StepActions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { canAllow: false } }
