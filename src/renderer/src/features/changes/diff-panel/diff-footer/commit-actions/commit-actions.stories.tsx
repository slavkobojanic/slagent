import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommitActions } from "@/features/changes/diff-panel/diff-footer/commit-actions/commit-actions"

const meta = {
  title: "Features/Changes/CommitActions",
  component: CommitActions,
  parameters: { layout: "fullscreen" },
  args: { canCommit: true, canPublish: true, pushLabel: "Push", onCommit: fn(), onPush: fn(), onOpenPr: fn() },
} satisfies Meta<typeof CommitActions>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Disabled: Story = { args: { canCommit: false, canPublish: false } }

export const PullRequestLabel: Story = { args: { pushLabel: "Update PR" } }
