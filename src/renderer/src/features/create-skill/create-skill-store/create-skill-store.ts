import { makeAutoObservable } from "mobx"
import type { SkillLocation } from "@shared/types"

export type CreateSkillStatus = "drafting" | "editing" | "saving" | "error"

// The state of the Create skill modal: the drafted skill, where it goes, and where the flow is.
export class CreateSkillStore {
  status: CreateSkillStatus = "editing"
  error: string | null = null
  userText = ""
  assistantText = ""
  guidance = ""
  name = ""
  description = ""
  body = ""
  location: SkillLocation = "user"

  constructor() {
    makeAutoObservable(this)
  }

  startDrafting(userText: string, assistantText: string, guidance: string) {
    this.status = "drafting"
    this.error = null
    this.userText = userText
    this.assistantText = assistantText
    this.guidance = guidance
    this.name = ""
    this.description = ""
    this.body = ""
    this.location = "user"
  }

  setDraft(name: string, description: string, body: string) {
    this.name = name
    this.description = description
    this.body = body
  }

  setName(name: string) {
    this.name = name
  }

  setDescription(description: string) {
    this.description = description
  }

  setLocation(location: SkillLocation) {
    this.location = location
  }

  setStatus(status: CreateSkillStatus) {
    this.status = status
  }

  setError(error: string | null) {
    this.error = error
  }

  reset() {
    this.status = "editing"
    this.error = null
    this.userText = ""
    this.assistantText = ""
    this.guidance = ""
    this.name = ""
    this.description = ""
    this.body = ""
    this.location = "user"
  }
}