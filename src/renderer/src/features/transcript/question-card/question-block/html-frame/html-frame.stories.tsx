import type { Meta, StoryObj } from "@storybook/react-vite"
import { HtmlFrame } from "@/features/transcript/question-card/question-block/html-frame/html-frame"

const meta = {
  title: "Features/Transcript/HtmlFrame",
  component: HtmlFrame,
  args: { html: "<h1 style=\"font-family: sans-serif\">Hello</h1>", title: "Mockup", frameKey: "q1", theme: "dark", height: 120 },
} satisfies Meta<typeof HtmlFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Dark: Story = {}

export const Light: Story = { args: { theme: "light" } }
