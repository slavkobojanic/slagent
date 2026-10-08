import type { Meta, StoryObj } from "@storybook/react-vite"
import { Sidebar } from "@/features/library/sidebar/sidebar"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  args: {
    searching: false,
    SearchBox: slot("SearchBox"),
    SearchResults: slot("SearchResults"),
    OpenProject: slot("OpenProject"),
    PinnedProjects: slot("PinnedProjects"),
    ResizeHandle: slot("ResizeHandle"),
  },
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Searching: Story = { args: { searching: true } }
