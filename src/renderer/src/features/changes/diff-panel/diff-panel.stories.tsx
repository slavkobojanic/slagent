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

export const LastTurn: Story = { args: { scope: "turn" } }

export const Loading: Story = { args: { loading: true } }
