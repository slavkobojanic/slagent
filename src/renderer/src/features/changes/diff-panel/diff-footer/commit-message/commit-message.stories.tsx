import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommitMessage } from "@/features/changes/diff-panel/diff-footer/commit-message/commit-message"

const meta = {
  title: "Features/Changes/CommitMessage",
  component: CommitMessage,
  parameters: { layout: "fullscreen" },
  args: {
    message: "feat(storybook): add stories for every view",
    placeholder: "Commit message",
    canEditMessage: true,
    canWriteMessage: true,
    writingMessage: false,
    onMessageChange: fn(),
    onCommitShortcut: fn(),
    onWriteMessage: fn(),
  },
} satisfies Meta<typeof CommitMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { message: "" } }

export const Disabled: Story = { args: { canEditMessage: false, canWriteMessage: false } }

export const Writing: Story = { args: { message: "", writingMessage: true } }
