import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChangesTabs } from "@/features/changes/changes-tabs/changes-tabs"

const meta = {
  title: "Features/Changes/ChangesTabs",
  component: ChangesTabs,
  args: { showing: "changes", hasPlan: false, onTab: fn(), onClose: fn() },
} satisfies Meta<typeof ChangesTabs>

export default meta
type Story = StoryObj<typeof meta>

export const ChangesOnly: Story = {}

export const WithPlan: Story = { args: { hasPlan: true, showing: "plan" } }
