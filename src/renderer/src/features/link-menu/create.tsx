import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { LinkPresenter } from "@/state/link/link-presenter/link-presenter"
import type { LinkStore } from "@/state/link/link-store/link-store"
import { LinkMenu } from "./link-menu"

export function createLinkMenu({ store, presenter }: { store: LinkStore; presenter: LinkPresenter }): ComponentType {
  return observer(function LinkMenuHost() {
    const menu = store.menu
    if (menu === null) {
      return null
    }
    return (
      <LinkMenu
        url={menu.url}
        x={menu.x}
        y={menu.y}
        preference={store.preference}
        onOpen={presenter.handleOpen}
        onCopy={presenter.handleCopy}
        onAskEveryTime={presenter.handleAskEveryTime}
      />
    )
  })
}