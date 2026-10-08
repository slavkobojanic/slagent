import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Changes } from "@/features/changes/changes"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Changes/Changes",
  component: Changes,
  parameters: { layout: "fullscreen" },
  args: {
    resizing: false,
    showing: "changes",
    Tabs: slot("Tabs"),
    DiffPanel: slot("DiffPanel"),
    FileViewer: slot("FileViewer"),
    PlanDocument: slot("PlanDocument"),
    onResizeStart: fn(),
    onResizeReset: fn(),
  },
} satisfies Meta<typeof Changes>

export default meta
type Story = StoryObj<typeof meta>

export const Diff: Story = {}

export const File: Story = { args: { showing: "file" } }

export const Plan: Story = { args: { showing: "plan" } }

export const Resizing: Story = { args: { resizing: true } }
