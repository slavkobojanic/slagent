import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { DiffPanel } from "@/features/changes/diff-panel/diff-panel"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Changes/DiffPanel",
  component: DiffPanel,
  parameters: { layout: "fullscreen" },
  args: {
    branch: "feat-storybook-stories",
    scope: "uncommitted",
    scopeLabel: "Uncommitted",
    commits: [
      { sha: "9f2c1ab", subject: "feat(changes): diff panel dropdown", date: "2 hours ago" },
      { sha: "4b7e0d3", subject: "fix(git): quote paths in status", date: "yesterday" },
    ],
    loading: false,
    DiffFiles: slot("DiffFiles"),
    DiffFooter: slot("DiffFooter"),
    onScope: fn(),
    onRefresh: fn(),
  },
} satisfies Meta<typeof DiffPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Uncommitted: Story = {}

export const LastTurn: Story = { args: { scope: "turn", scopeLabel: "Last turn" } }

export const SinceBranchStart: Story = { args: { scope: "branch", scopeLabel: "Since branch start" } }

export const PickedCommit: Story = {
  args: { scope: "commit:9f2c1ab", scopeLabel: "feat(changes): diff panel dropdown" },
}

export const Loading: Story = { args: { loading: true } }
