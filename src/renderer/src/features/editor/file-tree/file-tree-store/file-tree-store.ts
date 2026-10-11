import { makeAutoObservable } from "mobx"
import type { DirectoryEntry } from "@shared/types"
import type { TreeRow } from "@/features/editor/file-tree/file-tree-types"

const join = (parent: string, name: string): string => (parent === "" ? name : `${parent}/${name}`)

export class FileTreeStore {
  // Folder contents by project-relative path; "" is the project root.
  children: Record<string, DirectoryEntry[]> = {}
  expanded: string[] = []
  loading: string[] = []
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get rows(): TreeRow[] {
    const rows: TreeRow[] = []
    const visit = (parent: string, depth: number) => {
      for (const entry of this.children[parent] ?? []) {
        const path = join(parent, entry.name)
        const expanded = entry.dir && this.expanded.includes(path)
        rows.push({ path, name: entry.name, depth, dir: entry.dir, expanded, loading: this.loading.includes(path) })
        if (expanded) {
          visit(path, depth + 1)
        }
      }
    }
    visit("", 0)
    return rows
  }

  setChildren(path: string, entries: DirectoryEntry[]) {
    this.children[path] = entries
  }

  setExpanded(path: string, expanded: boolean) {
    const without = this.expanded.filter((existing) => existing !== path)
    this.expanded = expanded ? [...without, path] : without
  }

  setLoading(path: string, loading: boolean) {
    const without = this.loading.filter((existing) => existing !== path)
    this.loading = loading ? [...without, path] : without
  }

  setError(error: string | null) {
    this.error = error
  }

  reset() {
    this.children = {}
    this.expanded = []
    this.loading = []
    this.error = null
  }
}
