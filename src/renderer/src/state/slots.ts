import type { ComponentType, ReactNode } from "react"
import type { QuestionRequest } from "@shared/types"

// The components each owning create returns. They live here, not in the slice files, so
// a slice never imports another slice's create.tsx.

export type ReviewSlots = {
  CommentableResponse: ComponentType<{ messageId: string; children: ReactNode }>
}

export type AgentSlots = {
  Question: ComponentType<{ question: QuestionRequest }>
}

export type RunStatusSlots = {
  RunStatusBar: ComponentType
}

export type ComposerSlots = {
  Composer: ComponentType
}

export type TranscriptSlots = {
  Transcript: ComponentType
}

export type ChangesSlots = {
  RightPanel: ComponentType
}

export type LibrarySlots = {
  Sidebar: ComponentType
  LibraryDialogs: ComponentType
  CommandPalette: ComponentType
}

export type SettingsSlots = {
  SettingsDialog: ComponentType
}

export type ModelsSlots = {
  ModelDialog: ComponentType
  PermissionsWizard: ComponentType
}

// The slots the shell view renders. Review, agent and run-status slots are passed to
// the slices that need them and are not in this union.
export type ShellSlots = LibrarySlots & SettingsSlots & ModelsSlots & TranscriptSlots & ComposerSlots & ChangesSlots
