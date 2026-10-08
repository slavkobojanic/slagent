import type { Meta, StoryObj } from "@storybook/react-vite"
import { DiffFooter } from "@/features/changes/diff-panel/diff-footer/diff-footer"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Changes/DiffFooter",
  component: DiffFooter,
  parameters: { layout: "fullscreen" },
  args: { CommitMessage: slot("CommitMessage"), CommitActions: slot("CommitActions") },
} satisfies Meta<typeof DiffFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
