// Shape only, no colours: the colours come from the workbench's own theme settings. This is posted
// into the editor frame, where it rounds the chrome and softens borders to match the app.
export const EDITOR_FRAME_CSS = `
.monaco-workbench { font-family: -apple-system, "SF Pro Text", system-ui, sans-serif; }
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab { border-radius: 6px; margin: 4px 2px; height: 28px; }
.monaco-workbench .monaco-list .monaco-list-row { border-radius: 6px; }
.monaco-workbench .monaco-button { border-radius: 6px; }
.monaco-workbench .monaco-inputbox, .monaco-workbench .monaco-editor .suggest-widget, .monaco-workbench .monaco-menu-container { border-radius: 6px; }
`
