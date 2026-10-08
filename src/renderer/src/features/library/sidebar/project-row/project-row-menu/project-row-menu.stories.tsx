import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ProjectRowMenu } from "@/features/library/sidebar/project-row/project-row-menu/project-row-menu"
import { project } from "@/storybook/sample"

const meta = {
  title: "Features/Library/ProjectRowMenu",
  component: ProjectRowMenu,
  args: { project: project(), onPin: fn(), onRemove: fn() },
} satisfies Meta<typeof ProjectRowMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pinned: Story = { args: { project: project({ pinned: true }) } }
