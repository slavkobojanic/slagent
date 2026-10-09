import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ServerInfo } from "@shared/types"
import { ConnectSettings } from "@/features/settings/connect-settings/connect-settings"

const noop = () => undefined
const server: ServerInfo = {
  url: "ws://100.64.0.1:8747?token=t",
  host: "100.64.0.1",
  port: 8747,
  token: "t",
  name: "mac",
  tailscale: true,
}
const daemonProps = {
  daemon: { supported: true, installed: false, running: false },
  daemonBusy: false,
  daemonError: null,
  canEnable: true,
  canDisable: false,
  onEnable: noop,
  onDisable: noop,
}

describe("ConnectSettings", () => {
  it("can show the QR code and the address when the server is on the tailnet", () => {
    render(<ConnectSettings server={server} qr={{ size: 1, path: "M0 0h1v1h-1z" }} {...daemonProps} onCopy={noop} />)

    expect(screen.getByRole("img", { name: "QR code for the slagent iOS app" })).not.toBeNull()
    expect(screen.getByText(server.url)).not.toBeNull()
    expect(screen.getByText("On your tailnet")).not.toBeNull()
  })

  it("can ask for Tailscale when there is no code to show", () => {
    render(<ConnectSettings server={{ ...server, tailscale: false }} qr={null} {...daemonProps} onCopy={noop} />)

    expect(screen.getByText(/Turn on Tailscale/)).not.toBeNull()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("can say the server has not started", () => {
    render(<ConnectSettings server={null} qr={null} {...daemonProps} onCopy={noop} />)

    expect(screen.getByText(/has not started yet/)).not.toBeNull()
  })

  it("can offer the daemon install when it is not installed", () => {
    render(<ConnectSettings server={server} qr={null} {...daemonProps} onCopy={noop} />)

    expect(screen.getByRole("button", { name: /Install/ })).not.toBeNull()
    expect(screen.getByText(/launchd agent/)).not.toBeNull()
  })

  it("can offer the daemon remove when it is installed", () => {
    render(
      <ConnectSettings
        server={server}
        qr={null}
        {...daemonProps}
        daemon={{ supported: true, installed: true, running: true }}
        canEnable={false}
        canDisable={true}
        onCopy={noop}
      />,
    )

    expect(screen.getByRole("button", { name: /Remove/ })).not.toBeNull()
    expect(screen.getByText("Running")).not.toBeNull()
  })

  it("can hide the daemon section where launchd does not exist", () => {
    render(
      <ConnectSettings
        server={server}
        qr={null}
        {...daemonProps}
        daemon={{ supported: false, installed: false, running: false }}
        onCopy={noop}
      />,
    )

    expect(screen.queryByText(/launchd agent/)).toBeNull()
  })
})
