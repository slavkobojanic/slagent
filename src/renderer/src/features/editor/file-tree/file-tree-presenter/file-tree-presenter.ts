import type { FileTreeStore } from "@/features/editor/file-tree/file-tree-store/file-tree-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { EditorPort } from "@/state/editor-port/editor-port"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"

export class FileTreePresenter {
  private started = false
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: FileTreeStore,
    private readonly api: API,
    private readonly metaStore: MetaStore,
    private readonly layoutStore: LayoutStore,
    private readonly editorPort: EditorPort,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    // The tree reads the disk only while the editor is showing, and starts over for each project.
    this.disposers = [this.log.reaction("root", this.rootKey, this.handleRootChange, { fireImmediately: true })]
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.started = false
  }

  toggle = async (path: string) => {
    if (this.store.expanded.includes(path)) {
      this.store.setExpanded(path, false)
      return
    }
    this.store.setExpanded(path, true)
    if (this.store.children[path] === undefined) {
      await this.load(path)
    }
  }

  open = async (path: string) => {
    this.log.action("open-from-tree", { path })
    try {
      const file = await this.api.readFile(path)
      if (file !== null) {
        this.editorPort.open(file)
      }
    } catch (error) {
      this.log.warn("open-failed", { path, error })
      this.store.setError(errorText(error))
    }
  }

  // Files the agent added or removed since the folders were read.
  refresh = async () => {
    this.log.action("refresh")
    await Promise.all(["", ...this.store.expanded].map((path) => this.load(path)))
  }

  private rootKey = (): string => (this.layoutStore.editorMode ? (this.metaStore.meta?.cwd ?? "") : "")

  private handleRootChange = (cwd: string) => {
    this.store.reset()
    if (cwd !== "") {
      void this.load("")
    }
  }

  private load = async (path: string) => {
    this.store.setLoading(path, true)
    try {
      const entries = await this.api.listDirectory(path)
      if (entries === null) {
        // A folder that vanished is just left collapsed; only the root failing is worth saying.
        if (path === "") {
          this.store.setError("The project folder could not be read.")
        }
        return
      }
      this.store.setChildren(path, entries)
      this.store.setError(null)
    } catch (error) {
      this.log.warn("list-failed", { path, error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setLoading(path, false)
    }
  }
}
