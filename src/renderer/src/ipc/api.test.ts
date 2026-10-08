import { isObservable, observable } from "mobx"
import { describe, expect, it, vi } from "vitest"
import type { PromptRequest, SlagentApi } from "@shared/types"
import { API } from "@/ipc/api"
import { Log, nullLog } from "@/log/log"

function bridgeWith(overrides: Partial<SlagentApi>): SlagentApi {
  return { platform: "darwin", systemVersion: "24.0.0", ...overrides } as SlagentApi
}

describe("API", () => {
  describe("fromWindow", () => {
    it("can return null when the preload bridge is missing", () => {
      expect(API.fromWindow({} as Window, nullLog())).toBeNull()
    })

    it("can wrap the bridge when the preload ran", () => {
      const api = API.fromWindow({ slagent: bridgeWith({}) } as unknown as Window, nullLog())

      expect(api?.platform).toBe("darwin")
      expect(api?.systemVersion).toBe("24.0.0")
    })
  })

  describe("prompt", () => {
    it("can pass plain data to the bridge when the request is observable", async () => {
      const prompt = vi.fn().mockResolvedValue(undefined)
      const api = new API(bridgeWith({ prompt }), nullLog())
      const request: PromptRequest = observable({ text: "hi", mentions: [], chatMentions: [], files: [], comments: [], replies: [] })

      await api.prompt(request)

      const sent = prompt.mock.calls[0][0]
      expect(isObservable(sent)).toBe(false)
      expect(sent).toEqual({ text: "hi", mentions: [], chatMentions: [], files: [], comments: [], replies: [] })
    })

    it("can pass plain data to the bridge when a plain request holds store arrays", async () => {
      const prompt = vi.fn().mockResolvedValue(undefined)
      const api = new API(bridgeWith({ prompt }), nullLog())
      const comments = observable([{ id: "d1", path: "a.ts", line: 1, side: "new" as const, code: "x", text: "rename" }])
      const request: PromptRequest = { text: "hi", mentions: [], chatMentions: [], files: [], comments, replies: observable([]) }

      await api.prompt(request)

      const sent = prompt.mock.calls[0][0]
      expect(isObservable(sent.comments)).toBe(false)
      expect(isObservable(sent.comments[0])).toBe(false)
      expect(isObservable(sent.replies)).toBe(false)
      expect(() => structuredClone(sent)).not.toThrow()
    })
  })

  describe("openChat", () => {
    it("can forward every argument when the bridge is called", async () => {
      const openChat = vi.fn().mockResolvedValue(undefined)
      const api = new API(bridgeWith({ openChat }), nullLog())

      await api.openChat("chat-1", "project-1", "message-1")

      expect(openChat).toHaveBeenCalledWith("chat-1", "project-1", "message-1")
    })
  })

  describe("timing", () => {
    it("can log a span when a round trip finishes", async () => {
      const debug = vi.fn()
      const log = Log.create({
        sink: { debug, info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        clock: { now: () => 0, measure: vi.fn() },
        verbose: true,
        spec: "ipc:time",
      })
      const api = new API(bridgeWith({ deleteChat: vi.fn().mockResolvedValue(undefined) }), log.child("ipc"))

      await api.deleteChat("c1")

      expect(String(debug.mock.calls[0][0])).toContain("ipc:time %cdeleteChat")
      expect(debug.mock.calls[0].at(-1)).toEqual({ args: ["c1", undefined], ok: true })
    })
  })
})
