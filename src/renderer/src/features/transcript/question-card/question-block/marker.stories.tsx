import type { Meta, StoryObj } from "@storybook/react-vite"
import { Marker } from "@/features/transcript/question-card/question-block/marker"

const meta = {
  title: "Features/Transcript/Marker",
  component: Marker,
  args: { checked: false, index: 0 },
} satisfies Meta<typeof Marker>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}

export const Checked: Story = { args: { checked: true } }
