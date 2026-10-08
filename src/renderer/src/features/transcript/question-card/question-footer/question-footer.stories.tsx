import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { QuestionFooter } from "@/features/transcript/question-card/question-footer/question-footer"

const meta = {
  title: "Features/Transcript/QuestionFooter",
  component: QuestionFooter,
  args: {
    index: 0,
    count: 3,
    hasPrevious: false,
    hasNext: true,
    busy: false,
    stepReady: true,
    ready: false,
    onBack: fn(),
    onSkip: fn(),
    onNext: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof QuestionFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Next: Story = {}

export const BackAndSend: Story = { args: { index: 2, hasPrevious: true, hasNext: false, ready: true } }

export const SendDisabled: Story = { args: { index: 2, hasPrevious: true, hasNext: false, ready: false } }

export const Busy: Story = { args: { busy: true } }

export const SingleQuestion: Story = { args: { count: 1, hasNext: false, ready: true } }
