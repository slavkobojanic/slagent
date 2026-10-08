import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { QuestionImage } from "@/features/transcript/question-card/question-block/question-media/question-image/question-image"

const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%23333333'/%3E%3C/svg%3E"

const meta = {
  title: "Features/Transcript/QuestionImage",
  component: QuestionImage,
  args: { src: IMAGE, alt: "Layout mockup", broken: false, zoomed: false, onError: fn(), onZoomChange: fn() },
} satisfies Meta<typeof QuestionImage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Zoomed: Story = { args: { zoomed: true } }

export const Broken: Story = { args: { broken: true } }
