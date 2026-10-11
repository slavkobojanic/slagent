import type { ComponentType } from "react"
import { DEFAULT_EDITOR_PREFS, VIM_EXTENSION_ID } from "@shared/editor"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import { installedRows, isVimEnabled, resultRows } from "@/lib/editor-extensions"
import { formatTokens } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { ExtensionSettings } from "./extension-settings"
import { ExtensionSettingsPresenter } from "./extension-settings-presenter/extension-settings-presenter"
import { ExtensionSettingsStore } from "./extension-settings-store/extension-settings-store"

export function createExtensionSettings({ api, metaStore, log }: { api: API; metaStore: MetaStore; log: Log }): ComponentType {
  const store = new ExtensionSettingsStore()
  const presenter = new ExtensionSettingsPresenter(store, api, metaStore, log)

  return observer(function ExtensionSettingsHost() {
    const extensions = (metaStore.meta?.editor ?? DEFAULT_EDITOR_PREFS).extensions
    return (
      <ExtensionSettings
        vimOn={isVimEnabled(extensions)}
        vimBusy={store.busy.some((id) => id.toLowerCase() === VIM_EXTENSION_ID)}
        installed={installedRows(extensions, store.busy)}
        query={store.query}
        results={resultRows(store.results, extensions, store.busy).map((row) => ({ ...row, downloadsLabel: formatTokens(row.downloads) }))}
        searching={store.searching}
        searched={store.searched}
        canSearch={store.canSearch}
        error={store.error}
        onVim={presenter.handleVim}
        onToggle={presenter.handleToggle}
        onUninstall={presenter.handleUninstall}
        onQuery={presenter.handleQuery}
        onSearch={presenter.handleSearch}
        onInstall={presenter.handleInstall}
      />
    )
  })
}
