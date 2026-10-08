import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { AppCloseStore } from "@/features/app-close/app-close-store/app-close-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { AppClosePresenter } from "./app-close-presenter/app-close-presenter"
import { AppClose } from "./app-close"

export function createAppClose({ api, appCloseStore, log }: { api: API; appCloseStore: AppCloseStore; log: Log }): ComponentType {
  const presenter = new AppClosePresenter(appCloseStore, api, log)
  presenter.start()

  return observer(function AppCloseHost() {
    return <AppClose open={appCloseStore.open} busy={appCloseStore.busy} onCancel={presenter.handleCancel} onConfirm={() => void presenter.handleConfirm()} />
  })
}
