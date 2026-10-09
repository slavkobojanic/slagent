import { describe, expect, it } from "vitest"
import type { AppMeta, ServerInfo } from "@shared/types"
import { ConnectSettingsStore } from "@/features/settings/connect-settings/connect-settings-store/connect-settings-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"

function withServer(server: ServerInfo | null): ConnectSettingsStore {
  const metaStore = new MetaStore()
  metaStore.setMeta({ server } as AppMeta)
  return new ConnectSettingsStore(metaStore)
}

const tailnet: ServerInfo = { url: "ws://100.64.0.1:8747?token=t", host: "100.64.0.1", port: 8747, token: "t", tailscale: true }

describe("ConnectSettingsStore", () => {
  describe("server", () => {
    it("can be null when the meta has not arrived", () => {
      expect(new ConnectSettingsStore(new MetaStore()).server).toBeNull()
    })
  })

  describe("qr", () => {
    it("can draw a code when the server is on the tailnet", () => {
      expect(withServer(tailnet).qr?.size).toBeGreaterThan(0)
    })

    it("can skip the code when the server only listens on localhost", () => {
      expect(withServer({ ...tailnet, host: "127.0.0.1", tailscale: false }).qr).toBeNull()
    })

    it("can skip the code when the server has not started", () => {
      expect(withServer(null).qr).toBeNull()
    })
  })
})
