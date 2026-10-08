import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ProjectRow } from "@/features/library/sidebar/project-row/project-row"
import { project } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/ProjectRow",
  component: ProjectRow,
  args: {
    project: project(),
    active: false,
    collapsed: false,
    modKey: "⌘",
    onSelect: fn(),
    onNewChat: fn(),
    menu: slot("ProjectRowMenu"),
  },
} satisfies Meta<typeof ProjectRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Open: Story = { args: { active: true } }

export const Collapsed: Story = { args: { collapsed: true } }

export const Pinned: Story = { args: { project: project({ pinned: true }) } }
