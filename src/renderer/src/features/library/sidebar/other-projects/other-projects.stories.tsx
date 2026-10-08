import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OtherProjects } from "@/features/library/sidebar/other-projects/other-projects"
import { project } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/OtherProjects",
  component: OtherProjects,
  args: {
    others: [
      { project: project({ id: "p2", name: "website", pinned: true }), status: "running" },
      { project: project({ id: "p3", name: "notes", pinned: true }), status: "done" },
    ],
    isCollapsed: ((): boolean => false),
    onToggle: fn(),
    ProjectRow: slot("ProjectRow"),
    ProjectChatList: slot("ProjectChatList"),
  },
} satisfies Meta<typeof OtherProjects>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Collapsed: Story = { args: { isCollapsed: ((): boolean => true) } }

export const Empty: Story = { args: { others: [] } }
