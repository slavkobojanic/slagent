import type { LoadEditorRuntime } from "@/features/editor/editor-runtime"

// Monaco and the VS Code services are a few megabytes, so they load on first use and the chat
// view never pays for them.
export const loadEditorRuntime: LoadEditorRuntime = async () => {
  const { createEditorRuntime } = await import("./create-editor-runtime")
  return createEditorRuntime()
}
