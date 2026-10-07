import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { TranscriptPresenter } from "@/features/transcript/transcript-presenter/transcript-presenter"
import type { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"
import { ScrollDown } from "./scroll-down"

export function createScrollDown({
  runStore,
  transcriptStore,
  transcriptPresenter,
}: {
  runStore: RunStore
  transcriptStore: TranscriptStore
  transcriptPresenter: TranscriptPresenter
}): ComponentType {
  // Its own host, so the rows do not re-render when the button toggles.
  return observer(function ScrollDownHost() {
    return (
      <ScrollDown
        visible={!transcriptStore.atBottom}
        label={runStore.transcriptPage.hasNewer ? "Jump to latest" : undefined}
        onClick={transcriptPresenter.handleScrollDown}
      />
    )
  })
}
