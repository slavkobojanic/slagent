import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { RunStore } from "@/mirror/run-store/run-store"
import { awaitingModel } from "@/features/transcript/transcript-blocks"
import { Status } from "./status"

export function createStatus({ runStore }: { runStore: RunStore }): ComponentType {
  return observer(function StatusHost() {
    if (runStore.transcriptPage.hasNewer) {
      return null
    }
    return <Status pending={awaitingModel(runStore.messages, runStore.streaming) && !runStore.planProposal} notice={runStore.notice} />
  })
}
