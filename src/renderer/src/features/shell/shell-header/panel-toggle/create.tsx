import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import { modKey } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import { PanelToggle } from "./panel-toggle"
import { PanelTogglePresenter } from "./panel-toggle-presenter/panel-toggle-presenter"
import { panelToggleTitle } from "./panel-toggle-utils"

export function createPanelToggle({
  api,
  metaStore,
  panelStore,
  panelPresenter,
  log,
}: {
  api: API
  metaStore: MetaStore
  panelStore: PanelStore
  panelPresenter: PanelPresenter
  log: Log
}): ComponentType {
  const presenter = new PanelTogglePresenter(panelStore, panelPresenter, log)
  const mod = modKey(api.platform)

  return observer(function PanelToggleHost() {
    const open = panelStore.open
    return (
      <PanelToggle
        open={open}
        title={panelToggleTitle(open, mod)}
        disabled={(metaStore.meta?.cwd ?? "") === ""}
        onToggle={presenter.toggle}
      />
    )
  })
}
