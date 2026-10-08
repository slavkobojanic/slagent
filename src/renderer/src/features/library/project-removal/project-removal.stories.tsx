import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ProjectRemoval } from "@/features/library/project-removal/project-removal"

const meta = {
  title: "Features/Library/ProjectRemoval",
  component: ProjectRemoval,
  args: {
    open: true,
    projectName: "slagent",
    projectPath: "/work/slagent",
    typed: "",
    confirmed: false,
    busy: false,
    onTypedChange: fn(),
    onCancel: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ProjectRemoval>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Confirmed: Story = { args: { typed: "slagent", confirmed: true } }

export const Busy: Story = { args: { typed: "slagent", confirmed: true, busy: true } }

export const Closed: Story = { args: { open: false } }
