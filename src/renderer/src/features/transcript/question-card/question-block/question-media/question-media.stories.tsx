import type { Meta, StoryObj } from "@storybook/react-vite"
import { QuestionMedia } from "@/features/transcript/question-card/question-block/question-media/question-media"
import { slot } from "@/storybook/slots"

const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%23333333'/%3E%3C/svg%3E"

const meta = {
  title: "Features/Transcript/QuestionMedia",
  component: QuestionMedia,
  args: { title: "Which layout?", frameKey: "q1", Image: slot("Image"), HtmlFrame: slot("HtmlFrame") },
} satisfies Meta<typeof QuestionMedia>

export default meta
type Story = StoryObj<typeof meta>

export const Nothing: Story = {}

export const Image: Story = { args: { image: IMAGE } }

export const Mockup: Story = { args: { html: "<h1>Hello</h1>" } }

export const Preview: Story = { args: { preview: "**Bold** preview" } }
