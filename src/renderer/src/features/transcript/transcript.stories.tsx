import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Transcript } from "@/features/transcript/transcript"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Transcript/Transcript",
  component: Transcript,
  parameters: { layout: "fullscreen" },
  args: {
    streaming: false,
    attachScroll: fn(),
    onSettle: fn(),
    MessageList: slot("MessageList"),
    Status: slot("Status"),
    ScrollDown: slot("ScrollDown"),
    QuestionCard: slot("QuestionCard"),
  },
} satisfies Meta<typeof Transcript>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Streaming: Story = { args: { streaming: true } }
