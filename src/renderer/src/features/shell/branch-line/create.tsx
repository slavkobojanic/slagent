import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { BranchLine } from "./branch-line"
import { BranchLinePresenter } from "./branch-line-presenter/branch-line-presenter"
import type { BranchLineStore } from "./branch-line-store/branch-line-store"

export function createBranchLine({
  api,
  branchLineStore,
  metaStore,
  log,
}: {
  api: API
  branchLineStore: BranchLineStore
  metaStore: MetaStore
  log: Log
}): ComponentType {
  const presenter = new BranchLinePresenter(branchLineStore, api, metaStore, log.child("branch-line"))
  presenter.start()

  return observer(function BranchLineHost() {
    if (!branchLineStore.visible) {
      return null
    }
    return <BranchLine label={branchLineStore.label} aheadBehind={branchLineStore.aheadBehind} />
  })
}