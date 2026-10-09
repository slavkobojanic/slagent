import { observer } from "mobx-react-lite"
import type { LinkPresenter } from "@/state/link/link-presenter/link-presenter"
import type { LinkStore } from "@/state/link/link-store/link-store"
import { LinkPreferencePicker } from "./link-preference"

export function createLinkPreference({ store, presenter }: { store: LinkStore; presenter: LinkPresenter }) {
  return observer(function LinkPreferenceHost() {
    return <LinkPreferencePicker value={store.preference} onChange={presenter.setPreference} />
  })
}
