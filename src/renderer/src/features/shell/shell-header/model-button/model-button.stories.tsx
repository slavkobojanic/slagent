import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ModelButton } from "@/features/shell/shell-header/model-button/model-button"

const meta = {
  title: "Features/Shell/ModelButton",
  component: ModelButton,
  args: { name: "Claude Sonnet 4", provider: "openrouter", configured: true, disabled: false, onOpen: fn() },
} satisfies Meta<typeof ModelButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NotConfigured: Story = { args: { configured: false } }

export const Disabled: Story = { args: { disabled: true } }

export const NoProvider: Story = { args: { provider: null } }
