import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OpenRouterKey } from "@/features/settings/openrouter-key/openrouter-key"
import { openRouter } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Settings/OpenRouterKey",
  component: OpenRouterKey,
  args: {
    status: openRouter(),
    authFile: "/agent/auth.json",
    error: null,
    onSave: fn(),
    KeyField: slot("KeyField"),
    KeyActions: slot("KeyActions"),
  },
} satisfies Meta<typeof OpenRouterKey>

export default meta
type Story = StoryObj<typeof meta>

export const Unconfigured: Story = {}

export const Configured: Story = { args: { status: openRouter({ configured: true, source: "keychain", type: "api_key" }) } }

export const EnvironmentKey: Story = { args: { status: openRouter({ configured: true, source: "OPENROUTER_API_KEY", type: "api_key", envKey: true }) } }

export const Error: Story = { args: { error: "Invalid key" } }
