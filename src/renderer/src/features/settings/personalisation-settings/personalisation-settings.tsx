import type { ReactNode } from "react"
import type { Personalisation, PersonalisationBranch, PersonalisationBrevity, PersonalisationCommit, PersonalisationCommitStrategy, PersonalisationExplanation, PersonalisationTone } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// The Select cannot hold null, so "Default" stands for it: the agent keeps its own behaviour.
const DEFAULT = "default"

export type PersonalisationSettingsProps = {
  draft: Personalisation
  dirty: boolean
  saving: boolean
  canSave: boolean
  error: string | null
  onPatch: (next: Partial<Personalisation>) => void
  onSave: () => void
}

export function PersonalisationSettings({ draft, dirty, saving, canSave, error, onPatch, onSave }: PersonalisationSettingsProps) {
  return (
    <div className="space-y-4">
      <section className="space-y-4 border-t border-white/10 pt-4">
        <div>
          <h2 className="text-sm font-medium">Personalisation</h2>
          <p className="text-xs text-white/50">
            How the agent talks and works, in every chat. Anything left on Default keeps the agent&apos;s own behaviour.
            Changes apply from your next message.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tone">
            <ChoiceSelect
              value={draft.tone}
              onValueChange={(tone) => onPatch({ tone: choice<PersonalisationTone>(tone) })}
              options={[
                { value: "direct", label: "Direct" },
                { value: "friendly", label: "Friendly" },
                { value: "professional", label: "Professional" },
              ]}
            />
          </Field>
          <Field label="Brevity">
            <ChoiceSelect
              value={draft.brevity}
              onValueChange={(brevity) => onPatch({ brevity: choice<PersonalisationBrevity>(brevity) })}
              options={[
                { value: "terse", label: "Terse" },
                { value: "balanced", label: "Balanced" },
                { value: "detailed", label: "Detailed" },
              ]}
            />
          </Field>
          <Field label="Explanations">
            <ChoiceSelect
              value={draft.explanation}
              onValueChange={(explanation) => onPatch({ explanation: choice<PersonalisationExplanation>(explanation) })}
              options={[
                { value: "minimal", label: "Minimal — just do it" },
                { value: "normal", label: "Normal" },
                { value: "educational", label: "Educational — explain choices" },
              ]}
            />
          </Field>
          <Field label="Emoji">
            <ChoiceSelect
              value={tri(draft.emoji)}
              onValueChange={(emoji) => onPatch({ emoji: triValue(emoji) })}
              options={[
                { value: "yes", label: "Prefer emoji" },
                { value: "no", label: "No emoji" },
              ]}
            />
          </Field>
          <Field label="Branch names">
            <ChoiceSelect
              value={draft.branchNaming}
              onValueChange={(branchNaming) => onPatch({ branchNaming: choice<PersonalisationBranch>(branchNaming) })}
              options={[
                { value: "descriptive", label: "Kebab-case description" },
                { value: "prefix", label: "Type prefix" },
              ]}
            />
          </Field>
          <Field label="Commit messages">
            <ChoiceSelect
              value={draft.commitStyle}
              onValueChange={(commitStyle) => onPatch({ commitStyle: choice<PersonalisationCommit>(commitStyle) })}
              options={[
                { value: "conventional", label: "Conventional commits" },
                { value: "imperative", label: "Imperative summary" },
                { value: "free", label: "Keep it simple" },
              ]}
            />
          </Field>
          <Field label="Reply language">
            <Input
              value={draft.language ?? ""}
              placeholder="Auto — match your messages"
              onChange={(event) => onPatch({ language: event.target.value })}
            />
          </Field>
          {draft.branchNaming === "prefix" ? (
            <Field label="Branch prefix">
              <Input
                value={draft.branchPrefix ?? ""}
                placeholder="feat, fix, ticket-id…"
                spellCheck={false}
                onChange={(event) => onPatch({ branchPrefix: event.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Before finishing a turn">
            <ChoiceSelect
              value={tri(draft.checkBeforeFinish)}
              onValueChange={(check) => onPatch({ checkBeforeFinish: triValue(check) })}
              options={[
                { value: "yes", label: "Typecheck and test" },
                { value: "no", label: "Just finish" },
              ]}
            />
          </Field>
          <Field label="Committing and pushing">
            <ChoiceSelect
              value={draft.commitStrategy}
              onValueChange={(strategy) => onPatch({ commitStrategy: choice<PersonalisationCommitStrategy>(strategy) })}
              options={[
                { value: "ask", label: "Always ask first" },
                { value: "when-asked", label: "Only when I ask" },
                { value: "at-end", label: "Automatically — one commit at the end" },
                { value: "as-you-go", label: "Automatically — small commits as it goes" },
              ]}
            />
          </Field>
        </div>
        <Field label="Anything else">
          <Textarea
            value={draft.notes ?? ""}
            rows={4}
            placeholder="Extra instructions for the agent — conventions, pet peeves, context it should always have…"
            onChange={(event) => onPatch({ notes: event.target.value })}
          />
        </Field>
        {error !== null ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="button" disabled={!canSave} onClick={onSave}>
            {saving ? "Saving" : "Save"}
          </Button>
          {dirty ? <span className="text-xs text-white/40">Unsaved changes</span> : null}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ChoiceSelect({
  value,
  onValueChange,
  options,
}: {
  value: string | null
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value ?? DEFAULT} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT}>Default</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Maps a select value to a saved setting. Default becomes null.
function choice<T extends string>(value: string): T | null {
  if (value === DEFAULT) {
    return null
  }
  return value as T
}

// Maps a yes or no select value to a boolean setting. Default becomes null.
function triValue(value: string): boolean | null {
  if (value === "yes") {
    return true
  }
  if (value === "no") {
    return false
  }
  return null
}

function tri(value: boolean | null): string | null {
  if (value === true) {
    return "yes"
  }
  if (value === false) {
    return "no"
  }
  return null
}
