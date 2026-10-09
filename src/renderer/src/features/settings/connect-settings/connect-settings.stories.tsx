import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ConnectSettings } from "@/features/settings/connect-settings/connect-settings"
import { qrShape } from "@/lib/qr"

const server = {
  url: "ws://100.64.0.1:8747?token=abc",
  host: "100.64.0.1",
  port: 8747,
  token: "abc",
  name: "slavkos-macbook-pro",
  tailscale: true,
}

const daemon = {
  daemon: { supported: true, installed: false, running: false },
  daemonBusy: false,
  daemonError: null,
  canEnable: true,
  canDisable: false,
  onEnable: fn(),
  onDisable: fn(),
}

const meta = {
  title: "Features/Settings/ConnectSettings",
  component: ConnectSettings,
  args: { server, qr: qrShape("slagent://connect?host=100.64.0.1&port=8747&token=abc"), onCopy: fn(), ...daemon },
  decorators: [(Story) => <div className="max-w-lg">{Story()}</div>],
} satisfies Meta<typeof ConnectSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LocalOnly: Story = { args: { server: { ...server, host: "127.0.0.1", tailscale: false }, qr: null } }

export const NotStarted: Story = { args: { server: null, qr: null } }

export const DaemonRunning: Story = {
  args: { qr: null, daemon: { supported: true, installed: true, running: true }, canEnable: false, canDisable: true },
}

export const DaemonError: Story = { args: { qr: null, daemonError: "launchctl refused the install." } }
