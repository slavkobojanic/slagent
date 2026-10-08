import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PinnedProjects } from "@/features/library/sidebar/pinned-projects/pinned-projects"
import { project } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/PinnedProjects",
  component: PinnedProjects,
  args: {
    pinned: [
      { project: project({ id: "p2", name: "website", pinned: true }), status: "running" },
      { project: project({ id: "p3", name: "notes", pinned: true }), status: "done" },
    ],
    onOpen: fn(),
    ProjectRow: slot("ProjectRow"),
  },
} satisfies Meta<typeof PinnedProjects>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { pinned: [] } }
