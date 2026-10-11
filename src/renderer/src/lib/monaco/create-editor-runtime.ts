import "@codingame/monaco-vscode-theme-defaults-default-extension"
import * as monaco from "monaco-editor"
import { getService, IWorkbenchThemeService, initialize } from "@codingame/monaco-vscode-api"
import { ExtensionHostKind, registerExtension } from "@codingame/monaco-vscode-api/extensions"
import { CommandsRegistry } from "@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands"
import EditorWorker from "@codingame/monaco-vscode-api/workers/editor.worker?worker"
import extensionHostWorkerUrl from "@codingame/monaco-vscode-api/workers/extensionHost.worker?worker&url"
import getConfigurationServiceOverride from "@codingame/monaco-vscode-configuration-service-override"
import getExtensionsServiceOverride from "@codingame/monaco-vscode-extensions-service-override"
import getFilesServiceOverride from "@codingame/monaco-vscode-files-service-override"
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override"
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override"
import getTextmateServiceOverride from "@codingame/monaco-vscode-textmate-service-override"
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override"
import type { EditorEvents, EditorHandle, EditorRuntime, EditorThemeMode, EditorViewOptions } from "@/features/editor/editor-runtime"
import { PACK_LOADERS } from "./language-packs"
import { THEME_NAMES } from "./editor-theme"

function editorOptions({ fontSize, tabSize, wordWrap, minimap, fontFamily }: EditorViewOptions): monaco.editor.IEditorOptions & monaco.editor.ITextModelUpdateOptions {
  return {
    fontSize,
    fontFamily,
    tabSize,
    wordWrap: wordWrap ? "on" : "off",
    minimap: { enabled: minimap },
  }
}

// `initialize` may run once per page, so this builds the whole runtime exactly once.
export async function createEditorRuntime(): Promise<EditorRuntime> {
  // The extension host worker is handed to an iframe by URL, so it needs getWorkerUrl rather than getWorker.
  self.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
    getWorkerUrl: (_id: string, label: string) =>
      label === "extensionHostWorkerMain" ? new URL(extensionHostWorkerUrl, location.href).toString() : undefined,
    getWorkerOptions: () => ({ type: "module" }),
  }

  await initialize({
    ...getExtensionsServiceOverride({ enableWorkerExtensionHost: true }),
    ...getThemeServiceOverride(),
    ...getTextmateServiceOverride(),
    ...getLanguagesServiceOverride(),
    ...getFilesServiceOverride(),
    ...getConfigurationServiceOverride(),
    ...getKeybindingsServiceOverride(),
  })

  const themeService = await getService(IWorkbenchThemeService)
  const loadedPacks = new Set<string>()
  const registeredThemes = new Set<EditorThemeMode>()
  const models = new Map<string, monaco.editor.ITextModel>()
  const listeners = new Map<string, monaco.IDisposable>()
  let editor: monaco.editor.IStandaloneCodeEditor | null = null
  let events: EditorEvents | null = null

  const activePath = (): string | null => editor?.getModel()?.uri.fsPath ?? null

  // Vim's :w and :wq run these commands from the extension host.
  CommandsRegistry.registerCommand("workbench.action.files.save", () => {
    const path = activePath()
    if (path) events?.onSave(path)
  })
  CommandsRegistry.registerCommand("workbench.action.closeActiveEditor", () => {
    const path = activePath()
    if (path) events?.onClose(path)
  })

  // defineTheme does not exist with the VS Code theme service, so each mode is contributed as a
  // theme extension and selected by label.
  const registerTheme = async (mode: EditorThemeMode, themeJson: string) => {
    const extension = registerExtension(
      {
        name: `slagent-theme-${mode}`,
        publisher: "slagent",
        version: "1.0.0",
        engines: { vscode: "*" },
        contributes: { themes: [{ id: `slagent-${mode}`, label: THEME_NAMES[mode], uiTheme: mode === "dark" ? "vs-dark" : "vs", path: `./themes/${mode}.json` }] },
      },
      ExtensionHostKind.LocalProcess,
    )
    extension.registerFileUrl(`/themes/${mode}.json`, URL.createObjectURL(new Blob([themeJson], { type: "application/json" })))
    await extension.whenReady()
  }

  return {
    mount: (host, handlers, options): EditorHandle => {
      const widget = monaco.editor.create(host, {
        ...editorOptions(options),
        model: null,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 8, bottom: 8 },
      })
      editor = widget
      events = handlers
      const save = widget.addAction({
        id: "slagent.save",
        label: "Save",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => {
          const path = activePath()
          if (path) handlers.onSave(path)
        },
      })

      return {
        open: (path, contents) => {
          let model = models.get(path)
          if (!model) {
            model = monaco.editor.createModel(contents, undefined, monaco.Uri.file(path))
            listeners.set(
              path,
              model.onDidChangeContent(() => events?.onChange(path)),
            )
            models.set(path, model)
          }
          widget.setModel(model)
        },
        show: (path) => {
          const model = models.get(path)
          if (model) widget.setModel(model)
        },
        close: (path) => {
          listeners.get(path)?.dispose()
          listeners.delete(path)
          const model = models.get(path)
          models.delete(path)
          if (model && widget.getModel() === model) widget.setModel(null)
          model?.dispose()
        },
        read: (path) => models.get(path)?.getValue() ?? null,
        replace: (path, contents) => models.get(path)?.setValue(contents),
        focus: () => widget.focus(),
        dispose: () => {
          save.dispose()
          widget.dispose()
          if (editor === widget) editor = null
        },
      }
    },

    setOptions: (options) => {
      editor?.updateOptions(editorOptions(options))
      editor?.getModel()?.updateOptions({ tabSize: options.tabSize })
    },

    setTheme: async (mode, themeJson) => {
      if (!registeredThemes.has(mode)) {
        registeredThemes.add(mode)
        await registerTheme(mode, themeJson)
      }
      const themeList = await themeService.getColorThemes()
      const target = themeList.find((theme) => theme.label === THEME_NAMES[mode])
      if (target) await themeService.setColorTheme(target, undefined)
    },

    loadPacks: async (ids) => {
      for (const id of ids) {
        const load = PACK_LOADERS[id]
        if (!load || loadedPacks.has(id)) continue
        loadedPacks.add(id)
        await load()
      }
    },
  }
}
