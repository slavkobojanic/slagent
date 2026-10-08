import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ProjectRow } from "@/features/library/sidebar/project-row/project-row"
import { project } from "@/storybook/sample"

const meta = {
  title: "Features/Library/ProjectRow",
  component: ProjectRow,
  args: {
    project: project(),
    status: "idle",
    active: true,
    collapsed: false,
    modKey: "Cmd",
    onSelect: fn(),
    onNewChat: fn(),
    menu: <span className="px-2 text-xs text-foreground/40">Menu</span>,
  },
} satisfies Meta<typeof ProjectRow>

export default meta
type Story = StoryObj<typeof meta>

export const ActiveExpanded: Story = {}

export const ActiveCollapsed: Story = { args: { collapsed: true } }

export const Pinned: Story = { args: { active: false, project: project({ pinned: true }), status: "done" } }

export const Running: Story = { args: { active: false, status: "running" } }
