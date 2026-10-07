import { isObservable, observable } from "mobx"
import { describe, expect, it, vi } from "vitest"
import type { PromptRequest, SlagentApi } from "@shared/types"
import { API } from "@/ipc/api"

function bridgeWith(overrides: Partial<SlagentApi>): SlagentApi {
  return { platform: "darwin", systemVersion: "24.0.0", ...overrides } as SlagentApi
}

describe("API", () => {
  describe("fromWindow", () => {
    it("can return null when the preload bridge is missing", () => {
      expect(API.fromWindow({} as Window)).toBeNull()
    })

    it("can wrap the bridge when the preload ran", () => {
      const api = API.fromWindow({ slagent: bridgeWith({}) } as unknown as Window)

      expect(api?.platform).toBe("darwin")
      expect(api?.systemVersion).toBe("24.0.0")
    })
  })

  describe("prompt", () => {
    it("can pass plain data to the bridge when the request is observable", async () => {
      const prompt = vi.fn().mockResolvedValue(undefined)
      const api = new API(bridgeWith({ prompt }))
      const request: PromptRequest = observable({ text: "hi", mentions: [], chatMentions: [], files: [], comments: [], replies: [] })

      await api.prompt(request)

      const sent = prompt.mock.calls[0][0]
      expect(isObservable(sent)).toBe(false)
      expect(sent).toEqual({ text: "hi", mentions: [], chatMentions: [], files: [], comments: [], replies: [] })
    })
  })

  describe("openChat", () => {
    it("can forward every argument when the bridge is called", async () => {
      const openChat = vi.fn().mockResolvedValue(undefined)
      const api = new API(bridgeWith({ openChat }))

      await api.openChat("chat-1", "project-1", "message-1")

      expect(openChat).toHaveBeenCalledWith("chat-1", "project-1", "message-1")
    })
  })
})
