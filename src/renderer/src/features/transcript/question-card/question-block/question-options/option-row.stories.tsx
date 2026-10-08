import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OptionRow } from "@/features/transcript/question-card/question-block/question-options/option-row"

const meta = {
  title: "Features/Transcript/OptionRow",
  component: OptionRow,
  args: { option: { label: "Storybook", description: "One story per named state", recommended: true }, index: 0, checked: false, onPick: fn() },
} satisfies Meta<typeof OptionRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { checked: true } }

export const Plain: Story = { args: { option: { label: "Ladle" }, index: 1 } }
