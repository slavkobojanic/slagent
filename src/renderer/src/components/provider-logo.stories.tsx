import type { Meta, StoryObj } from "@storybook/react-vite"
import { ProviderLogo } from "@/components/provider-logo"

const meta = {
  title: "Components/ProviderLogo",
  component: ProviderLogo,
} satisfies Meta<typeof ProviderLogo>

export default meta
type Story = StoryObj<typeof meta>

export const ClaudeCode: Story = { args: { provider: "claude-code" } }

export const OpenRouter: Story = { args: { provider: "openrouter" } }

export const NoProvider: Story = { args: { provider: null } }
