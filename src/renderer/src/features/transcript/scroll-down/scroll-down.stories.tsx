import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ScrollDown } from "@/features/transcript/scroll-down/scroll-down"

const meta = {
  title: "Features/Transcript/ScrollDown",
  component: ScrollDown,
  parameters: { layout: "fullscreen" },
  args: { visible: true, label: "Jump to the latest", onClick: fn() },
} satisfies Meta<typeof ScrollDown>

export default meta
type Story = StoryObj<typeof meta>

export const Visible: Story = {}

export const Hidden: Story = { args: { visible: false } }
