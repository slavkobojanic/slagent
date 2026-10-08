import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { ProjectSummary } from "@shared/types"
import { OtherProjects, type OtherProjectsProps } from "@/features/library/sidebar/other-projects/other-projects"
import { project } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/OtherProjects",
  component: OtherProjects,
  args: {
    noProject: null,
    others: [],
    isCollapsed: fn(() => false),
    onToggle: fn(),
    onNewChat: fn(),
    ProjectRow: slot("ProjectRow"),
    ProjectChatList: slot("ProjectChatList"),
    OpenProject: slot("OpenProject"),
  },
} satisfies Meta<typeof OtherProjects>

export default meta
type Story = StoryObj<typeof meta>

// Every code project, the open one included, with the No project group above them.
export const NoProject: Story = {
  args: {
    noProject: { project: project({ id: "no-project", name: "No project", path: "", mode: "chat" }), status: "running", active: false },
    others: [
      { project: project({ id: "p2", name: "Beta", path: "/work/beta", running: true }), status: "running", active: false },
      { project: project({ id: "p3", name: "Gamma", path: "/work/gamma", attention: true }), status: "done", active: true },
    ],
  },
}

export const OnlyNoProject: Story = {
  args: {
    noProject: { project: project({ id: "no-project", name: "No project", path: "", mode: "chat" }), status: "idle", active: false },
  },
}

export const Empty: Story = {}
