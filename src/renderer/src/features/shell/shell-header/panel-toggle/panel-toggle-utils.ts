export function panelToggleTitle(open: boolean, mod: string, editorMode: boolean): string {
  if (editorMode) return "The side panel is not available while the editor is open"
  return `${open ? "Hide" : "Show"} panel (${mod}⇧D)`
}
