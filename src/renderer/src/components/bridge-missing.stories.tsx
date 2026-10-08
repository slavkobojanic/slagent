import type { Meta, StoryObj } from "@storybook/react-vite"
import { BridgeMissing } from "@/components/bridge-missing"

const meta = {
  title: "Components/BridgeMissing",
  component: BridgeMissing,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BridgeMissing>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
