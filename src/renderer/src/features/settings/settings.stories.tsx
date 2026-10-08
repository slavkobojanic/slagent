import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Settings } from "@/features/settings/settings"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Settings/Settings",
  component: Settings,
  args: {
    open: true,
    tab: "general",
    onTabChange: fn(),
    onOpenChange: fn(),
    ThemePicker: slot("ThemePicker"),
    OpenRouterKey: slot("OpenRouterKey"),
    TitleModel: slot("TitleModel"),
    ProviderRouting: slot("ProviderRouting"),
    PersonalisationSettings: slot("PersonalisationSettings"),
    McpSettings: slot("McpSettings"),
    CliSettings: slot("CliSettings"),
    About: slot("About"),
    ConnectSettings: slot("ConnectSettings"),
  },
} satisfies Meta<typeof Settings>

export default meta
type Story = StoryObj<typeof meta>

export const General: Story = {}

export const Personalisation: Story = { args: { tab: "personalisation" } }

export const Connect: Story = { args: { tab: "connect" } }

export const Mcp: Story = { args: { tab: "mcp" } }

export const Cli: Story = { args: { tab: "cli" } }

export const Closed: Story = { args: { open: false } }
