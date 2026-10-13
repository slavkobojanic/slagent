// Shape only, no colours: the colours come from the workbench's own theme settings. This is posted
// into the editor frame, where it rounds the chrome and softens borders to match the app. Tabs copy
// the terminal bar's chips: small pills, in Inter. The inactive text colour is the normal
// foreground rather than the faded one the workbench derives.
export const EDITOR_FRAME_CSS = `
.monaco-workbench { font-family: "Geist Variable", -apple-system, system-ui, sans-serif !important; --modern-ui-editor-tab-inactive-foreground: var(--vscode-foreground) !important; }
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  font-family: "Inter Variable", "Geist Variable", system-ui, sans-serif !important;
  font-size: 11px !important;
  border-radius: 4px !important;
}
.monaco-workbench .monaco-list .monaco-list-row { border-radius: 6px; }
.monaco-workbench .monaco-button { border-radius: 6px; }
.monaco-workbench .monaco-inputbox, .monaco-workbench .monaco-editor .suggest-widget, .monaco-workbench .monaco-menu-container { border-radius: 6px; }
.monaco-editor .review-widget .head .review-title { font-weight: 500; }
.monaco-editor .review-widget .body .comment-form-container .monaco-editor {
  border-radius: 16px !important;
  padding: 12px 0 12px 14px !important;
  outline: none !important;
  overflow: hidden;
}
.monaco-editor .review-widget .body .comment-form-container .monaco-editor .monaco-editor-background,
.monaco-editor .review-widget .body .comment-form-container .monaco-editor .margin { background-color: transparent !important; }
.monaco-editor .review-widget .body .comment-form-container .monaco-editor .decorationsOverviewRuler { display: none !important; }
.monaco-editor .review-widget .body .form-actions { padding-top: 4px; }
.monaco-editor .review-widget .body .form-actions .monaco-button {
  height: 32px !important;
  padding: 0 12px !important;
  margin: 0 0 0 8px !important;
  font-size: 13px !important;
  font-weight: 500;
  line-height: 32px !important;
  border: 0 !important;
}
`
