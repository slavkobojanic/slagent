import type { Meta, StoryObj } from "@storybook/react-vite"
import { PlanDocument } from "@/features/changes/plan-document/plan-document"

const meta = {
  title: "Features/Changes/PlanDocument",
  component: PlanDocument,
  parameters: { layout: "fullscreen" },
  args: {
    plan: "## Plan\n\n1. Set up Storybook\n2. Write one story per named state\n3. Commit",
  },
} satisfies Meta<typeof PlanDocument>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
