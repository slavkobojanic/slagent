import { toast } from "sonner"
import {
  EMPTY_PERSONALISATION,
  PINNED_FILE_CHAR_LIMIT,
  PINNED_FILE_COUNT_LIMIT,
  PINNED_TOTAL_CHAR_LIMIT,
  type Personalisation,
  type PinnedFile,
} from "@shared/types"
import type { PersonalisationSettingsStore } from "@/features/settings/personalisation-settings/personalisation-settings-store/personalisation-settings-store"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class PersonalisationSettingsPresenter {
  private disposeShown: (() => void) | null = null

  constructor(
    private readonly store: PersonalisationSettingsStore,
    private readonly api: API,
    private readonly metaStore: MetaStore,
    private readonly overlayStore: OverlayStore,
    private readonly settingsStore: SettingsStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposeShown !== null) {
      return
    }
    this.disposeShown = this.log.reaction(
      "shown",
      () => this.shown(),
      (shown) => {
        if (shown) {
          this.store.reset(this.saved())
        }
      },
    )
  }

  stop = () => {
    this.disposeShown?.()
    this.disposeShown = null
  }

  handlePatch = (next: Partial<Personalisation>) => {
    this.store.patch(next)
  }

  // Opens the file picker and adds the picked files to the draft, enforcing the
  // pinning limits: 25k characters per file, 50k in total. Re-picking a name
  // replaces the pinned copy, so updating a file is just picking it again.
  handlePickFiles = async () => {
    let picked: PinnedFile[]
    try {
      picked = await this.api.pickContextFiles()
    } catch (error) {
      this.log.warn("pick-files-failed", { error })
      toast.error(errorText(error))
      return
    }
    if (picked.length === 0) return

    const next = [...(this.store.draft.pinnedFiles ?? [])]
    let total = next.reduce((sum, file) => sum + file.content.length, 0)
    const rejected: string[] = []
    let added = 0
    for (const file of picked) {
      if (file.content.length > PINNED_FILE_CHAR_LIMIT) {
        rejected.push(`${file.name} — too large (${file.content.length.toLocaleString()} / ${PINNED_FILE_CHAR_LIMIT.toLocaleString()} chars per file)`)
        continue
      }
      if (total + file.content.length > PINNED_TOTAL_CHAR_LIMIT) {
        rejected.push(`${file.name} — would exceed the ${PINNED_TOTAL_CHAR_LIMIT.toLocaleString()} char total`)
        continue
      }
      const existing = next.findIndex((pinned) => pinned.name === file.name)
      if (existing === -1) {
        if (next.length >= PINNED_FILE_COUNT_LIMIT) {
          rejected.push(`${file.name} — at most ${PINNED_FILE_COUNT_LIMIT} files`)
          continue
        }
        next.push(file)
      } else {
        total -= next[existing]!.content.length
        next[existing] = file
      }
      total += file.content.length
      added += 1
    }

    if (added > 0) {
      this.store.patch({ pinnedFiles: next })
      toast.success(added === 1 ? "File pinned — save to apply" : `${added} files pinned — save to apply`)
    }
    if (rejected.length > 0) {
      toast.error(`Not pinned: ${rejected.join("; ")}`, { duration: 8000 })
    }
  }

  handleRemoveFile = (name: string) => {
    const files = this.store.draft.pinnedFiles
    if (!files || !files.some((file) => file.name === name)) return
    this.store.patch({ pinnedFiles: files.filter((file) => file.name !== name) })
  }

  handleSave = async () => {
    if (!this.store.canSave(this.saved())) {
      return
    }
    this.log.action("save", { draft: this.store.draft })

    this.store.setError(null)
    this.store.setSaving(true)
    try {
      await this.api.setPersonalisation(this.store.draft)
      toast.success("Personalisation saved")
    } catch (error) {
      this.log.warn("save-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setSaving(false)
    }
  }

  private saved = (): Personalisation => this.metaStore.meta?.personalisation ?? EMPTY_PERSONALISATION

  private shown = () => this.overlayStore.settingsOpen && this.settingsStore.tab === "personalisation"
}
