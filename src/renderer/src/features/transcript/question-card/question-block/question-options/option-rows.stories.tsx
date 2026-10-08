import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OptionRows } from "@/features/transcript/question-card/question-block/question-options/option-rows"
import { question } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/OptionRows",
  component: OptionRows,
  args: { question: question(), selected: [], onPick: fn() },
} satisfies Meta<typeof OptionRows>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Picked: Story = { args: { selected: ["Ladle"] } }
