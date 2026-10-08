import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PromptTextarea } from "@/features/composer/prompt-form/prompt-textarea/prompt-textarea"

const meta = {
  title: "Features/Composer/PromptTextarea",
  component: PromptTextarea,
  parameters: { layout: "fullscreen" },
  args: {
    text: "",
    placeholder: "Ask for a change in this folder",
    disabled: false,
    attach: fn(),
    onChange: fn(),
    onSelect: fn(),
    onKeyDown: fn(),
    onPaste: fn(),
    onCompositionStart: fn(),
    onCompositionEnd: fn(),
  },
} satisfies Meta<typeof PromptTextarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithText: Story = { args: { text: "Add storybook stories for every component." } }

export const Disabled: Story = { args: { disabled: true } }
