import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EditorToggle } from "@/features/shell/shell-header/editor-toggle/editor-toggle"

const meta = {
  title: "Features/Shell/ShellHeader/EditorToggle",
  component: EditorToggle,
  args: { on: false, disabled: false, onToggle: fn() },
} satisfies Meta<typeof EditorToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}

export const On: Story = { args: { on: true } }

export const Disabled: Story = { args: { disabled: true } }
