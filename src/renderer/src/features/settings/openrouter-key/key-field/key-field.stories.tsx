import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { KeyField } from "@/features/settings/openrouter-key/key-field/key-field"

const meta = {
  title: "Features/Settings/KeyField",
  component: KeyField,
  args: { apiKey: "", visible: false, oauth: false, onApiKeyChange: fn(), onToggleVisible: fn() },
} satisfies Meta<typeof KeyField>

export default meta
type Story = StoryObj<typeof meta>

export const Hidden: Story = {}

export const Visible: Story = { args: { apiKey: "sk-or-v1-abc123", visible: true } }

export const OAuth: Story = { args: { oauth: true } }
