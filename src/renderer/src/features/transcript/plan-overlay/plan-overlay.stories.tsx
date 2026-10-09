import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PlanOverlay } from "@/features/transcript/plan-overlay/plan-overlay"

const meta = {
  title: "Features/Transcript/PlanOverlay",
  component: PlanOverlay,
  parameters: { layout: "fullscreen" },
  args: { plan: null, approving: false, onAccept: fn(), onRevise: fn(), onCancel: fn() },
  render: (args) => (
    <div className="relative h-96 bg-background p-8 text-sm text-muted-foreground">
      <p>The plan is open in the right panel.</p>
      <PlanOverlay {...args} />
    </div>
  ),
} satisfies Meta<typeof PlanOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Approving: Story = { args: { approving: true } }

export const WithPlan: Story = { args: { plan: "## Plan\n\n1. Add the connect screen\n2. Wire the websocket\n3. Ship it" } }
