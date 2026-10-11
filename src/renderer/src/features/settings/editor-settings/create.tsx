import type { ComponentType } from "react"
import { DEFAULT_EDITOR_PREFS } from "@shared/editor"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import { packRows } from "@/lib/editor-packs"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { EditorSettings } from "./editor-settings"
import { createExtensionSettings } from "./extension-settings/create"
import { EditorSettingsPresenter } from "./editor-settings-presenter/editor-settings-presenter"
import { EditorSettingsStore } from "./editor-settings-store/editor-settings-store"

export function createEditorSettings({ api, metaStore, log }: { api: API; metaStore: MetaStore; log: Log }): ComponentType {
  const store = new EditorSettingsStore()
  const presenter = new EditorSettingsPresenter(store, api, metaStore, log)
  const Extensions = createExtensionSettings({ api, metaStore, log: log.child("extension-settings") })

  return observer(function EditorSettingsHost() {
    const prefs = metaStore.meta?.editor ?? DEFAULT_EDITOR_PREFS
    return (
      <EditorSettings
        fontSize={prefs.fontSize}
        tabSize={prefs.tabSize}
        wordWrap={prefs.wordWrap}
        minimap={prefs.minimap}
        packs={packRows(prefs.packs)}
        Extensions={Extensions}
        error={store.error}
        onFontSize={presenter.handleFontSize}
        onTabSize={presenter.handleTabSize}
        onWordWrap={presenter.handleWordWrap}
        onMinimap={presenter.handleMinimap}
        onTogglePack={presenter.handleTogglePack}
      />
    )
  })
}
