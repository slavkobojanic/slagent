import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OtherRow } from "@/features/transcript/question-card/question-block/other-row/other-row"

const meta = {
  title: "Features/Transcript/OtherRow",
  component: OtherRow,
  args: { multiSelect: false, optionCount: 3, other: "", onChange: fn() },
} satisfies Meta<typeof OtherRow>

export default meta
type Story = StoryObj<typeof meta>

export const SingleChoice: Story = {}

export const MultiSelect: Story = { args: { multiSelect: true } }

export const Filled: Story = { args: { other: "Or nothing at all" } }
