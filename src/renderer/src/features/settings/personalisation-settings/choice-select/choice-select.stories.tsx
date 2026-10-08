import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChoiceSelect } from "@/features/settings/personalisation-settings/choice-select/choice-select"

const meta = {
  title: "Features/Settings/ChoiceSelect",
  component: ChoiceSelect,
  args: {
    value: null,
    onValueChange: fn(),
    options: [
      { value: "direct", label: "Direct" },
      { value: "friendly", label: "Friendly" },
      { value: "professional", label: "Professional" },
    ],
  },
} satisfies Meta<typeof ChoiceSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Chosen: Story = { args: { value: "friendly" } }
