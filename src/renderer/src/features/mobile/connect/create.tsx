import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import { Connect } from "./connect"
import { ConnectPresenter } from "./connect-presenter/connect-presenter"
import { ConnectStore } from "./connect-store/connect-store"

export function createConnect({ device, log }: { device: Device; log: Log }): ComponentType {
  const store = new ConnectStore()
  const presenter = new ConnectPresenter(store, device, log)
  presenter.start()

  return observer(function ConnectHost() {
    return (
      <Connect
        text={store.text}
        busy={store.busy}
        canConnect={store.canConnect}
        error={store.error}
        onTextChange={presenter.handleTextChange}
        onSubmit={presenter.handleSubmit}
      />
    )
  })
}
