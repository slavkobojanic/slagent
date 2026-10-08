import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ModelRowButton } from "@/features/models/model-list/provider-group/model-row-button/model-row-button"

const meta = {
  title: "Features/Models/ModelRowButton",
  component: ModelRowButton,
  args: {
    row: { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "openrouter", detail: "anthropic/claude-sonnet-4 · 200k", selected: false },
    canSelect: true,
    onSelect: fn(),
  },
} satisfies Meta<typeof ModelRowButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = { args: { row: { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "openrouter", detail: "anthropic/claude-sonnet-4 · 200k", selected: true } } }

export const Disabled: Story = { args: { canSelect: false } }
