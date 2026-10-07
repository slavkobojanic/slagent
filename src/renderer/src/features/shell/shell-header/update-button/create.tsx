import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { UpdateButton } from "./update-button"
import { UpdateButtonPresenter } from "./update-button-presenter/update-button-presenter"
import type { UpdateButtonStore } from "./update-button-store/update-button-store"

export function createUpdateButton({
  api,
  updateButtonStore,
  log,
}: {
  api: API
  updateButtonStore: UpdateButtonStore
  log: Log
}): ComponentType {
  const presenter = new UpdateButtonPresenter(updateButtonStore, api, log)
  presenter.start()

  return observer(function UpdateButtonHost() {
    return <UpdateButton version={updateButtonStore.version} installing={updateButtonStore.installing} onInstall={presenter.installUpdate} />
  })
}
