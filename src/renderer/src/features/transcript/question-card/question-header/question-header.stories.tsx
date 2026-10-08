import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { QuestionHeader } from "@/features/transcript/question-card/question-header/question-header"

const meta = {
  title: "Features/Transcript/QuestionHeader",
  component: QuestionHeader,
  args: { header: "Storybook", question: "Which library should the stories use?", open: true, busy: false, onToggleOpen: fn(), onSkip: fn() },
} satisfies Meta<typeof QuestionHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Collapsed: Story = { args: { open: false } }

export const NoHeader: Story = { args: { header: undefined } }

export const Busy: Story = { args: { busy: true } }
