import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ProjectMenu } from "@/features/shell/shell-header/project-menu/project-menu"

const meta = {
  title: "Features/Shell/ProjectMenu",
  component: ProjectMenu,
  args: {
    label: "slagent",
    path: "/work/slagent",
    projects: [
      { id: "p1", name: "slagent", status: "running" },
      { id: "p2", name: "website", status: "done" },
    ],
    onOpenProject: fn(),
    onChooseFolder: fn(),
    onCreateChatProject: fn(),
  },
} satisfies Meta<typeof ProjectMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoProject: Story = { args: { label: "Choose folder", path: undefined, projects: [] } }
