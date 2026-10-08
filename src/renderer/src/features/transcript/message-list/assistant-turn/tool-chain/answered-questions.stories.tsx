import type { Meta, StoryObj } from "@storybook/react-vite"
import { AnsweredQuestions } from "@/features/transcript/message-list/assistant-turn/tool-chain/answered-questions"
import { answeredQuestion } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/AnsweredQuestions",
  component: AnsweredQuestions,
  args: { answers: [answeredQuestion()] },
} satisfies Meta<typeof AnsweredQuestions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithOtherAndNote: Story = {
  args: { answers: [answeredQuestion({ selected: ["Ladle"], other: "Or nothing at all", note: "Prefer fewer dependencies" })] },
}

export const Skipped: Story = { args: { answers: [answeredQuestion({ skipped: true })] } }
