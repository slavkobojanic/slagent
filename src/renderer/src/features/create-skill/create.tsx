import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { BuiltinRunner } from "@/features/composer/composer-presenter/composer-presenter"
import { CreateSkillDialog } from "./create-skill"
import { CreateSkillPresenter } from "./create-skill-presenter/create-skill-presenter"
import { CreateSkillStore } from "./create-skill-store/create-skill-store"

export function createCreateSkill({
  api,
  runStore,
  overlayStore,
  log,
}: {
  api: API
  runStore: RunStore
  overlayStore: OverlayStore
  log: Log
}): { CreateSkill: ComponentType; openBuiltin: BuiltinRunner } {
  const store = new CreateSkillStore()
  const presenter = new CreateSkillPresenter(store, runStore, api, overlayStore, log)

  const CreateSkill = observer(function CreateSkillHost() {
    return (
      <CreateSkillDialog
        open={overlayStore.createSkillOpen}
        status={store.status}
        error={store.error}
        guidance={store.guidance}
        name={store.name}
        description={store.description}
        body={store.body}
        location={store.location}
        onName={presenter.setName}
        onDescription={presenter.setDescription}
        onLocation={presenter.setLocation}
        onOpenChange={presenter.handleOpenChange}
        onCreate={() => void presenter.create()}
      />
    )
  })

  return { CreateSkill, openBuiltin: presenter.open }
}