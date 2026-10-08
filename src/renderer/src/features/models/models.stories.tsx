import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Models } from "@/features/models/models"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Models/Models",
  component: Models,
  args: { open: true, query: "", overflowNotice: null, error: null, onOpenChange: fn(), onQueryChange: fn(), ModelList: slot("ModelList") },
} satisfies Meta<typeof Models>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Closed: Story = { args: { open: false } }

export const Overflow: Story = { args: { overflowNotice: "Showing 40 OpenRouter models. Refine the search to see more." } }

export const Error: Story = { args: { error: "Could not switch model." } }
