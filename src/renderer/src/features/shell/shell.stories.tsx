import type { Meta, StoryObj } from "@storybook/react-vite"
import { Shell } from "@/features/shell/shell"
import { fill, slot } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/Shell",
  component: Shell,
  parameters: { layout: "fullscreen" },
  args: {
    inert: false,
    Header: slot("Header"),
    SidebarFrame: fill("SidebarFrame"),
    MainColumn: fill("MainColumn"),
    PanelFrame: fill("PanelFrame"),
    TerminalDrawer: fill("Terminal"),
    TerminalBar: slot("TerminalBar"),
    Settings: slot("Settings"),
    Models: slot("Models"),
    CreateSkill: slot("CreateSkill"),
  },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Inert: Story = { args: { inert: true } }
