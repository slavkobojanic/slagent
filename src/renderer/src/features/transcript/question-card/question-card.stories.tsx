import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { QuestionCard } from "@/features/transcript/question-card/question-card"
import { question } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Transcript/QuestionCard",
  component: QuestionCard,
  args: {
    question: question(),
    direction: 1,
    open: true,
    error: null,
    onKey: fn(),
    Header: slot("Header"),
    Block: slot("Block"),
    Footer: slot("Footer"),
  },
} satisfies Meta<typeof QuestionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Collapsed: Story = { args: { open: false } }

export const Error: Story = { args: { error: "The reply could not be sent." } }
