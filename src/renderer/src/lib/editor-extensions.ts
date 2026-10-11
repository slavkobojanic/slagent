import { VIM_EXTENSION_ID, type EditorExtensionPref, type EditorExtensionResult } from "@shared/editor"

export type InstalledRow = {
  id: string
  version: string
  enabled: boolean
  busy: boolean
}

export type ResultRow = {
  id: string
  name: string
  description: string
  downloads: number
  verified: boolean
  installed: boolean
  busy: boolean
}

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

export function isVimInstalled(extensions: EditorExtensionPref[]): boolean {
  return extensions.some((extension) => same(extension.id, VIM_EXTENSION_ID))
}

export function isVimEnabled(extensions: EditorExtensionPref[]): boolean {
  return extensions.some((extension) => same(extension.id, VIM_EXTENSION_ID) && extension.enabled)
}

// Vim has its own switch, so the list below it holds everything else.
export function installedRows(extensions: EditorExtensionPref[], busy: string[]): InstalledRow[] {
  return extensions
    .filter((extension) => !same(extension.id, VIM_EXTENSION_ID))
    .map((extension) => ({ id: extension.id, version: extension.version, enabled: extension.enabled, busy: busy.some((id) => same(id, extension.id)) }))
}

export function resultRows(results: EditorExtensionResult[], extensions: EditorExtensionPref[], busy: string[]): ResultRow[] {
  return results.map((result) => ({
    id: result.id,
    name: result.name,
    description: result.description,
    downloads: result.downloads,
    verified: result.verified,
    installed: extensions.some((extension) => same(extension.id, result.id)),
    busy: busy.some((id) => same(id, result.id)),
  }))
}
