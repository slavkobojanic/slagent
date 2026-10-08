import type { Meta, StoryObj } from "@storybook/react-vite"
import { StepError } from "@/features/permissions-wizard/step-error/step-error"

const meta = {
  title: "Features/PermissionsWizard/StepError",
  component: StepError,
  args: { error: "Could not read the permission state." },
} satisfies Meta<typeof StepError>

export default meta
type Story = StoryObj<typeof meta>

export const Error: Story = {}

export const None: Story = { args: { error: null } }
