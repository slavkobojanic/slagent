import { EDITOR_FONT_SIZE, EDITOR_TAB_SIZE } from "@shared/editor"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingSwitch } from "@/features/settings/editor-settings/setting-switch/setting-switch"

export type EditorSettingsProps = {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  error: string | null
  onFontSize: (value: number) => void
  onTabSize: (value: number) => void
  onWordWrap: (value: boolean) => void
  onMinimap: (value: boolean) => void
}

export function EditorSettings({ fontSize, tabSize, wordWrap, minimap, error, onFontSize, onTabSize, onWordWrap, onMinimap }: EditorSettingsProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Editor</h2>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="editor-font-size" className="text-xs text-white/60">
              Font size
            </Label>
            <Input
              id="editor-font-size"
              type="number"
              className="w-20"
              min={EDITOR_FONT_SIZE.min}
              max={EDITOR_FONT_SIZE.max}
              value={fontSize}
              onChange={(event) => onFontSize(event.target.valueAsNumber)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="editor-tab-size" className="text-xs text-white/60">
              Tab size
            </Label>
            <Input
              id="editor-tab-size"
              type="number"
              className="w-20"
              min={EDITOR_TAB_SIZE.min}
              max={EDITOR_TAB_SIZE.max}
              value={tabSize}
              onChange={(event) => onTabSize(event.target.valueAsNumber)}
            />
          </div>
        </div>
        <SettingSwitch label="Word wrap" description="Wrap long lines instead of scrolling sideways." checked={wordWrap} onChange={onWordWrap} />
        <SettingSwitch label="Minimap" description="Show a zoomed out overview beside the code." checked={minimap} onChange={onMinimap} />
        {error === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      <p className="text-sm text-white/60">
        The editor is VS Code. Install extensions, change themes and keybindings, and turn Vim on from its Extensions view (the puzzle icon in the editor's toolbar).
      </p>
    </div>
  )
}
