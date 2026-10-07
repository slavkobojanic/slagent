import { describe, expect, it } from "vitest"
import { SettingsPresenter } from "@/features/settings/settings-presenter/settings-presenter"
import { SettingsStore } from "@/features/settings/settings-store/settings-store"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

function setup() {
  const store = new SettingsStore()
  const overlay = new OverlayStore()
  const commands = new CommandRegistry()
  const presenter = new SettingsPresenter(store, overlay, commands)
  return { store, overlay, commands, presenter }
}

describe("SettingsPresenter", () => {
  describe("start", () => {
    it("can register the settings command under Actions on Cmd+,", () => {
      const { commands, presenter } = setup()

      presenter.start()

      const command = commands.commands.find((item) => item.id === "settings.open")
      expect(command?.label).toBe("Settings")
      expect(command?.group).toBe("Actions")
      expect(command?.shortcut).toEqual({ key: ",", mod: true })
      presenter.stop()
    })

    it("can run the command to open the dialog", () => {
      const { overlay, commands, presenter } = setup()
      presenter.start()

      commands.run("settings.open")

      expect(overlay.settingsOpen).toBe(true)
      presenter.stop()
    })

    it("can register the command only once when started twice", () => {
      const { commands, presenter } = setup()

      presenter.start()
      presenter.start()

      expect(commands.commands.filter((item) => item.id === "settings.open")).toHaveLength(1)
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can remove the command it registered", () => {
      const { commands, presenter } = setup()
      presenter.start()

      presenter.stop()

      expect(commands.commands).toHaveLength(0)
    })
  })

  describe("handleTabChange", () => {
    it("can select the section", () => {
      const { store, presenter } = setup()

      presenter.handleTabChange("cli")

      expect(store.tab).toBe("cli")
    })
  })

  describe("handleOpenChange", () => {
    it("can close the dialog", () => {
      const { overlay, presenter } = setup()
      overlay.setOpen("settings", true)

      presenter.handleOpenChange(false)

      expect(overlay.settingsOpen).toBe(false)
    })
  })
})
