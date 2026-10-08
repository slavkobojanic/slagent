import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PlanToggle } from "@/features/composer/prompt-form/plan-toggle/plan-toggle"

const meta = {
  title: "Features/Composer/PlanToggle",
  component: PlanToggle,
  args: { planMode: false, disabled: false, onToggle: fn() },
} satisfies Meta<typeof PlanToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}

export const On: Story = { args: { planMode: true } }

export const Disabled: Story = { args: { disabled: true } }
