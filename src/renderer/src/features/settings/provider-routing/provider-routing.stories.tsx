import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ProviderRouting } from "@/features/settings/provider-routing/provider-routing"

const meta = {
  title: "Features/Settings/ProviderRouting",
  component: ProviderRouting,
  args: { value: "balance", error: null, onValueChange: fn() },
} satisfies Meta<typeof ProviderRouting>

export default meta
type Story = StoryObj<typeof meta>

export const Balance: Story = {}

export const Speed: Story = { args: { value: "speed" } }

export const Cost: Story = { args: { value: "cost" } }

export const Error: Story = { args: { error: "Could not save the preference." } }
