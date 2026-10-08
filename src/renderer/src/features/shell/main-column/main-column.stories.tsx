import type { Meta, StoryObj } from "@storybook/react-vite"
import { MainColumn } from "@/features/shell/main-column/main-column"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/MainColumn",
  component: MainColumn,
  parameters: { layout: "fullscreen" },
  args: {
    ready: true,
    metaError: null,
    actionError: null,
    Transcript: fill("Transcript"),
    Composer: fill("Composer"),
    PlanOverlay: fill("PlanOverlay"),
    BranchLine: fill("BranchLine"),
  },
} satisfies Meta<typeof MainColumn>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Starting: Story = { args: { ready: false } }

export const MetaError: Story = { args: { metaError: "Could not load the workspace." } }

export const ActionError: Story = { args: { actionError: "The last request failed." } }
