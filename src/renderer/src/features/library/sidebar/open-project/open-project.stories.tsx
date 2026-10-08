import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { OpenProject } from "@/features/library/sidebar/open-project/open-project"
import { project } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/OpenProject",
  component: OpenProject,
  args: {
    project: project(),
    collapsed: false,
    onToggle: fn(),
    onNewChat: fn(),
    ProjectRow: slot("ProjectRow"),
    ChatList: slot("ChatList"),
    ChooseFolder: slot("ChooseFolder"),
  },
} satisfies Meta<typeof OpenProject>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Collapsed: Story = { args: { collapsed: true } }

export const NoProject: Story = { args: { project: null } }
