import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { QuestionBlock } from "@/features/transcript/question-card/question-block/question-block"
import { question } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Transcript/QuestionBlock",
  component: QuestionBlock,
  args: { question: question(), attachQuestion: fn(), Media: slot("Media"), Options: slot("Options"), Other: slot("Other") },
} satisfies Meta<typeof QuestionBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
