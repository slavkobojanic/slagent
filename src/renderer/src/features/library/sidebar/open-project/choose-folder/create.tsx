import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ChooseFolder } from "./choose-folder"
import { ChooseFolderPresenter } from "./choose-folder-presenter/choose-folder-presenter"

export function createChooseFolder({ api, commandRegistry }: { api: API; commandRegistry: CommandRegistry }): ComponentType {
  const presenter = new ChooseFolderPresenter(api, commandRegistry)
  presenter.start()

  return function ChooseFolderHost() {
    return <ChooseFolder onChooseFolder={() => void presenter.handleChooseFolder()} />
  }
}
