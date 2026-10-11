// Shape only, no colours: the colours come from the workbench's own theme settings. This is posted
// into the editor frame, where it rounds the chrome and softens borders to match the app. Tabs copy
// the terminal bar's chips: small pills in the mono font. The inactive text colour is the normal
// foreground rather than the faded one the workbench derives.
export const EDITOR_FRAME_CSS = `
.monaco-workbench { font-family: "Geist Variable", -apple-system, system-ui, sans-serif !important; --modern-ui-editor-tab-inactive-foreground: var(--vscode-foreground) !important; }
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  font-family: "Monaspace Neon Var", ui-monospace, monospace !important;
  font-size: 12px !important;
  border-radius: 4px !important;
}
.monaco-workbench .monaco-list .monaco-list-row { border-radius: 6px; }
.monaco-workbench .monaco-button { border-radius: 6px; }
.monaco-workbench .monaco-inputbox, .monaco-workbench .monaco-editor .suggest-widget, .monaco-workbench .monaco-menu-container { border-radius: 6px; }
`
