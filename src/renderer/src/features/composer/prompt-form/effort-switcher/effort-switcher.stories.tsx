import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EffortSwitcher } from "@/features/composer/prompt-form/effort-switcher/effort-switcher"

const meta = {
  title: "Features/Composer/EffortSwitcher",
  component: EffortSwitcher,
  args: { effort: "medium", onValueChange: fn() },
} satisfies Meta<typeof EffortSwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const High: Story = { args: { effort: "high" } }

export const Max: Story = { args: { effort: "max" } }