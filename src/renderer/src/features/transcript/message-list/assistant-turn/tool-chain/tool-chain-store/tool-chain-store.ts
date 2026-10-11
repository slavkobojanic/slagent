import { makeAutoObservable } from "mobx"

// The open and step state of one tool chain. One component hosts every turn's chain, so the
// state is keyed by the turn instead of living on the component.
type ChainState = {
  // A chain that mounted while a step ran stays open so the progress shows, and settles closed
  // once the steps have been quiet; a chain that mounted on a finished turn never auto-opens.
  mountedWhileRunning: boolean
  userOpen: boolean | null
  autoOpen: boolean
  expandedSteps: Map<string, boolean>
}

export class ToolChainStore {
  private chains = new Map<string, ChainState>()

  constructor() {
    makeAutoObservable(this)
  }

  isMounted(id: string): boolean {
    return this.chains.has(id)
  }

  mount(id: string, mountedWhileRunning: boolean) {
    this.chains.set(id, { mountedWhileRunning, userOpen: null, autoOpen: mountedWhileRunning, expandedSteps: new Map() })
  }

  mountedWhileRunning(id: string): boolean {
    return this.chains.get(id)?.mountedWhileRunning ?? false
  }

  open(id: string): boolean {
    const chain = this.chains.get(id)
    if (chain === undefined) return false
    return chain.userOpen ?? chain.autoOpen
  }

  setUserOpen(id: string, value: boolean | null) {
    this.chainOf(id).userOpen = value
  }

  setAutoOpen(id: string, value: boolean) {
    this.chainOf(id).autoOpen = value
  }

  stepExpanded(id: string, stepId: string): boolean {
    return this.chains.get(id)?.expandedSteps.get(stepId) ?? false
  }

  toggleStep(id: string, stepId: string) {
    const chain = this.chainOf(id)
    chain.expandedSteps.set(stepId, !(chain.expandedSteps.get(stepId) ?? false))
  }

  private chainOf(id: string): ChainState {
    const chain = this.chains.get(id)
    if (chain !== undefined) return chain
    const fresh: ChainState = { mountedWhileRunning: false, userOpen: null, autoOpen: false, expandedSteps: new Map() }
    this.chains.set(id, fresh)
    return fresh
  }
}
