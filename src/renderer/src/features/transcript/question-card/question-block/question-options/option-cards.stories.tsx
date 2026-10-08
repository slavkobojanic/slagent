import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OptionCards } from "@/features/transcript/question-card/question-block/question-options/option-cards"
import { question } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%23333333'/%3E%3C/svg%3E"

const visualQuestion = question({
  options: [
    { label: "Sidebar", description: "Left rail", image: IMAGE },
    { label: "Top bar", description: "Header menu", image: IMAGE },
    { label: "Command palette", description: "Keyboard first", image: IMAGE },
  ],
})

const meta = {
  title: "Features/Transcript/OptionCards",
  component: OptionCards,
  args: { question: visualQuestion, selected: [], HtmlFrame: slot("HtmlFrame"), onPick: fn() },
} satisfies Meta<typeof OptionCards>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Picked: Story = { args: { selected: ["Top bar"] } }
