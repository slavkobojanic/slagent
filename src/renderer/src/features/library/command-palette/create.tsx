import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { CommandPalette } from "./command-palette"
import { CommandPalettePresenter } from "./command-palette-presenter/command-palette-presenter"
import { CommandPaletteStore } from "./command-palette-store/command-palette-store"
import { paletteGroups } from "./palette-items"

export function createCommandPalette({
  api,
  window,
  libraryStore,
  metaStore,
  runStore,
  overlayStore,
  commandRegistry,
  composerPort,
  chatSwitchPresenter,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  metaStore: MetaStore
  runStore: RunStore
  overlayStore: OverlayStore
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  chatSwitchPresenter: ChatSwitchPresenter
  log: Log
}): ComponentType {
  const store = new CommandPaletteStore()
  const presenter = new CommandPalettePresenter(store, api, window, overlayStore, commandRegistry, composerPort, chatSwitchPresenter, log)
  presenter.start()

  return observer(function CommandPaletteHost() {
    const meta = metaStore.meta
    return (
      <CommandPalette
        open={overlayStore.paletteOpen}
        query={store.query}
        onOpenChange={presenter.handleOpenChange}
        onQueryChange={presenter.handleQueryChange}
        groups={paletteGroups({
          platform: api.platform,
          commands: commandRegistry.commands,
          chats: libraryStore.library.chats,
          projects: libraryStore.library.projects,
          slashCommands: store.slashCommands,
          query: store.query,
          models: meta?.models ?? [],
          currentModelId: meta?.modelId ?? null,
          streaming: runStore.streaming,
          onRunCommand: presenter.handleRunCommand,
          onOpenChat: presenter.handleOpenChat,
          onOpenProject: presenter.handleOpenProject,
          onFillCommand: presenter.handleFillCommand,
          onSelectModel: presenter.handleSelectModel,
        })}
      />
    )
  })
}
