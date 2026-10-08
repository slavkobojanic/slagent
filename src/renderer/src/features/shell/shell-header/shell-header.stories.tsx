import type { Meta, StoryObj } from "@storybook/react-vite"
import { ShellHeader } from "@/features/shell/shell-header/shell-header"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/ShellHeader",
  component: ShellHeader,
  args: {
    macos: false,
    SidebarToggle: slot("SidebarToggle"),
    ProjectMenu: slot("ProjectMenu"),
    ChatTitle: slot("ChatTitle"),
    UpdateButton: slot("UpdateButton"),
    ModelButton: slot("ModelButton"),
    PanelToggle: slot("PanelToggle"),
    SettingsButton: slot("SettingsButton"),
  },
} satisfies Meta<typeof ShellHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const MacOS: Story = { args: { macos: true } }
