// Editor settings and the language packs the editor can load. The ids are the
// suffix of each @codingame/monaco-vscode-<id>-default-extension package.
export type EditorPack = {
  id: string
  label: string
  languages: string
  defaultOn: boolean
}

export const EDITOR_PACKS: EditorPack[] = [
  { id: "typescript-basics", label: "TypeScript", languages: "TypeScript, TSX", defaultOn: true },
  { id: "javascript", label: "JavaScript", languages: "JavaScript, JSX", defaultOn: true },
  { id: "json", label: "JSON", languages: "JSON, JSONC", defaultOn: true },
  { id: "css", label: "CSS", languages: "CSS, SCSS, Less", defaultOn: true },
  { id: "html", label: "HTML", languages: "HTML", defaultOn: true },
  { id: "markdown-basics", label: "Markdown", languages: "Markdown", defaultOn: true },
  { id: "yaml", label: "YAML", languages: "YAML", defaultOn: true },
  { id: "shellscript", label: "Shell", languages: "Bash, Zsh, sh", defaultOn: true },
  { id: "xml", label: "XML", languages: "XML, XSL", defaultOn: true },
  { id: "ini", label: "INI", languages: "INI, properties", defaultOn: true },
  { id: "diff", label: "Diff", languages: "Diff, patch", defaultOn: true },
  { id: "python", label: "Python", languages: "Python", defaultOn: true },
  { id: "go", label: "Go", languages: "Go", defaultOn: false },
  { id: "rust", label: "Rust", languages: "Rust", defaultOn: false },
  { id: "swift", label: "Swift", languages: "Swift", defaultOn: false },
  { id: "java", label: "Java", languages: "Java", defaultOn: false },
  { id: "cpp", label: "C and C++", languages: "C, C++, Objective-C", defaultOn: false },
  { id: "csharp", label: "C#", languages: "C#", defaultOn: false },
  { id: "php", label: "PHP", languages: "PHP", defaultOn: false },
  { id: "ruby", label: "Ruby", languages: "Ruby", defaultOn: false },
  { id: "lua", label: "Lua", languages: "Lua", defaultOn: false },
  { id: "sql", label: "SQL", languages: "SQL", defaultOn: false },
  { id: "docker", label: "Docker", languages: "Dockerfile", defaultOn: false },
]

export const VIM_EXTENSION_ID = "vscodevim.vim"

// An extension installed from Open VSX, kept by its folder under userData.
export type EditorExtensionPref = {
  id: string
  version: string
  enabled: boolean
}

export type EditorPrefs = {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  packs: string[]
  extensions: EditorExtensionPref[]
}

export const EDITOR_FONT_SIZE = { min: 8, max: 32 }
export const EDITOR_TAB_SIZE = { min: 1, max: 8 }

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  packs: EDITOR_PACKS.filter((pack) => pack.defaultOn).map((pack) => pack.id),
  extensions: [],
}

// publisher.name, as on Open VSX. The id becomes a folder name, so nothing else gets through.
const EXTENSION_ID = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9._-]*$/i
const EXTENSION_VERSION = /^[0-9][0-9a-z.+-]*$/i

export function isExtensionId(value: unknown): value is string {
  return typeof value === "string" && EXTENSION_ID.test(value)
}

export function isExtensionVersion(value: unknown): value is string {
  return typeof value === "string" && EXTENSION_VERSION.test(value)
}

// One Open VSX search hit.
export type EditorExtensionResult = {
  id: string
  version: string
  name: string
  description: string
  downloads: number
  verified: boolean
  iconUrl: string | null
}

// What the editor needs to register an installed extension: its manifest, every file in it
// (relative to the extension root) and the base url the files are served from.
export type EditorExtensionPayload = {
  id: string
  version: string
  manifest: Record<string, unknown>
  files: string[]
  baseUrl: string
}
