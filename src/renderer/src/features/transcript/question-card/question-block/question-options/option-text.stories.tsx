import type { Meta, StoryObj } from "@storybook/react-vite"
import { OptionText } from "@/features/transcript/question-card/question-block/question-options/option-text"

const meta = {
  title: "Features/Transcript/OptionText",
  component: OptionText,
  args: { option: { label: "Storybook", description: "One story per named state", recommended: true } },
} satisfies Meta<typeof OptionText>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Plain: Story = { args: { option: { label: "Ladle" } } }
