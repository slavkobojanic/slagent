import { makeAutoObservable } from "mobx"

export class ToolChainStore {
  userOpen: boolean | null = null
  autoOpen = false
  expandedSteps = new Map<string, boolean>()

  constructor() {
    makeAutoObservable(this)
  }

  get open(): boolean {
    return this.userOpen ?? this.autoOpen
  }

  setUserOpen(value: boolean | null) {
    this.userOpen = value
  }

  setAutoOpen(value: boolean) {
    this.autoOpen = value
  }

  toggleStep(stepId: string) {
    const current = this.expandedSteps.get(stepId) ?? false
    this.expandedSteps.set(stepId, !current)
  }

  setStepExpanded(stepId: string, expanded: boolean) {
    this.expandedSteps.set(stepId, expanded)
  }

  getStepExpanded(stepId: string): boolean {
    return this.expandedSteps.get(stepId) ?? false
  }

  collapseAllSteps() {
    this.expandedSteps.clear()
  }
}
