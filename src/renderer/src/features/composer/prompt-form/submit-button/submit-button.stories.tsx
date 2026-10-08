import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SubmitButton } from "@/features/composer/prompt-form/submit-button/submit-button"

const meta = {
  title: "Features/Composer/SubmitButton",
  component: SubmitButton,
  args: { status: "ready", disabled: false, onStop: fn() },
} satisfies Meta<typeof SubmitButton>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Streaming: Story = { args: { status: "streaming" } }

export const Disabled: Story = { args: { disabled: true } }
