import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ConnectSettings } from "@/features/settings/connect-settings/connect-settings"
import { qrShape } from "@/lib/qr"

const server = { url: "ws://100.64.0.1:8747?token=abc", host: "100.64.0.1", port: 8747, token: "abc", tailscale: true }

const meta = {
  title: "Features/Settings/ConnectSettings",
  component: ConnectSettings,
  args: { server, qr: qrShape("slagent://connect?host=100.64.0.1&port=8747&token=abc"), onCopy: fn() },
  decorators: [(Story) => <div className="max-w-lg">{Story()}</div>],
} satisfies Meta<typeof ConnectSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LocalOnly: Story = { args: { server: { ...server, host: "127.0.0.1", tailscale: false }, qr: null } }

export const NotStarted: Story = { args: { server: null, qr: null } }
