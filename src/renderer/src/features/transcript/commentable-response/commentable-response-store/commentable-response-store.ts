import { makeAutoObservable } from "mobx"

// The text a comment box opens with: a new comment on a quote, or an edit of a saved comment.
export type DraftState = { id?: string; quote: string; at?: number }

// The popover offered after words are selected in a unit. Its position is relative to the unit's wrapper.
export type PendingSelection = { quote: string; at: number; top: number; left: number }

// The hover card of a commented excerpt that the pointer is over.
export type OpenCard = { commentId: string; top: number; left: number }

type UnitState = {
  draft: DraftState | null
  pending: PendingSelection | null
  card: OpenCard | null
  cardOpen: boolean
}

const IDLE: UnitState = { draft: null, pending: null, card: null, cardOpen: false }

// The interaction state of each commentable unit, keyed by the unit's key. An entry lasts until
// the open chat changes.
export class CommentableResponseStore {
  private units = new Map<string, UnitState>()

  constructor() {
    makeAutoObservable(this)
  }

  draftOf(key: string): DraftState | null {
    return this.stateOf(key).draft
  }

  pendingOf(key: string): PendingSelection | null {
    return this.stateOf(key).pending
  }

  cardOf(key: string): OpenCard | null {
    return this.stateOf(key).card
  }

  isCardOpen(key: string): boolean {
    return this.stateOf(key).cardOpen
  }

  setDraft(key: string, draft: DraftState | null) {
    this.update(key, { draft })
  }

  setPending(key: string, pending: PendingSelection | null) {
    this.update(key, { pending })
  }

  setCard(key: string, card: OpenCard | null) {
    this.update(key, { card })
  }

  setCardOpen(key: string, open: boolean) {
    this.update(key, { cardOpen: open })
  }

  // A selection that collapsed takes the popover away from every unit.
  clearPending() {
    for (const [key, state] of this.units) {
      if (state.pending !== null) {
        this.units.set(key, { ...state, pending: null })
      }
    }
  }

  reset() {
    this.units.clear()
  }

  private stateOf(key: string): UnitState {
    return this.units.get(key) ?? IDLE
  }

  private update(key: string, patch: Partial<UnitState>) {
    this.units.set(key, { ...this.stateOf(key), ...patch })
  }
}
