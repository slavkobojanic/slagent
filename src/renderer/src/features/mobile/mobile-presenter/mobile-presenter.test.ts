import { describe, expect, it } from "vitest"
import type { API } from "@/ipc/api"
import type { Device } from "@/ipc/device"
import { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createMockInstance } from "@/test/create-mock-instance"

function setup() {
  const libraryStore = new LibraryStore()
  const store = new MobileStore(libraryStore)
  const themeStore = new ThemeStore()
  const api = createMockInstance<API>(["openChat", "newChat", "createChatProject", "onReconnect"])
  api.openChat.mockResolvedValue(undefined)
  api.newChat.mockResolvedValue(undefined)
  api.createChatProject.mockResolvedValue(undefined)
  let reconnect: () => void = () => undefined
  api.onReconnect.mockImplementation((listener: () => void) => {
    reconnect = listener
    return () => undefined
  })
  const device = createMockInstance<Device>(["setDarkChrome", "hideKeyboardBar"])
  const presenter = new MobilePresenter(store, libraryStore, themeStore, api, device, nullLog())
  return { libraryStore, store, themeStore, api, device, presenter, reconnect: () => reconnect() }
}

describe("MobilePresenter", () => {
  describe("openChat", () => {
    it("can show the chat once the host has opened it", async () => {
      const { store, api, presenter } = setup()
      await presenter.openChat("p1", "c1")
      expect(api.openChat).toHaveBeenCalledWith("c1", "p1")
      expect(store.screen).toBe("chat")
      expect(store.opening).toBeNull()
    })

    it("can stay on the list with an error when the host refuses", async () => {
      const { store, api, presenter } = setup()
      api.openChat.mockRejectedValue(new Error("Chat not found"))
      await presenter.openChat("p1", "c1")
      expect(store.screen).toBe("chats")
      expect(store.error).toBe("Chat not found")
    })

    it("can ignore a second tap while a chat is opening", async () => {
      const { store, api, presenter } = setup()
      store.setOpening("c0")
      await presenter.openChat("p1", "c1")
      expect(api.openChat).not.toHaveBeenCalled()
    })
  })

  describe("newChat", () => {
    it("can start a draft in a project", async () => {
      const { store, api, presenter } = setup()
      await presenter.newChat("p1")
      expect(api.newChat).toHaveBeenCalledWith("p1")
      expect(store.screen).toBe("chat")
    })

    it("can start a chat without a folder when no project is given", async () => {
      const { api, presenter } = setup()
      await presenter.newChat(null)
      expect(api.createChatProject).toHaveBeenCalled()
    })
  })

  describe("back", () => {
    it("can return to the list", () => {
      const { store, presenter } = setup()
      store.setScreen("chat")
      presenter.back()
      expect(store.screen).toBe("chats")
    })
  })

  describe("handleConnectionOpenChange", () => {
    it("can open and close the connection sheet", () => {
      const { store, presenter } = setup()
      presenter.openConnection()
      expect(store.connectionOpen).toBe(true)
      presenter.handleConnectionOpenChange(false)
      expect(store.connectionOpen).toBe(false)
    })
  })

  describe("start", () => {
    it("can match the status bar to the theme", () => {
      const { themeStore, device, presenter } = setup()
      presenter.start()
      expect(device.setDarkChrome).toHaveBeenLastCalledWith(false, undefined, expect.anything())
      themeStore.setPreference("dark")
      expect(device.setDarkChrome).toHaveBeenLastCalledWith(true, false, expect.anything())
      presenter.stop()
    })

    it("can reopen the chat it was on when the socket comes back", () => {
      const { libraryStore, store, api, presenter, reconnect } = setup()
      presenter.start()
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c1" })
      store.setScreen("chat")
      reconnect()
      expect(api.openChat).toHaveBeenCalledWith("c1", "p1")
      presenter.stop()
    })

    it("can reopen a draft when the socket comes back mid-draft", () => {
      const { libraryStore, store, api, presenter, reconnect } = setup()
      presenter.start()
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: null })
      store.setScreen("chat")
      reconnect()
      expect(api.newChat).toHaveBeenCalledWith("p1")
      presenter.stop()
    })

    it("can leave the session alone when the list is showing", () => {
      const { libraryStore, api, presenter, reconnect } = setup()
      presenter.start()
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c1" })
      reconnect()
      expect(api.openChat).not.toHaveBeenCalled()
      presenter.stop()
    })
  })
})
