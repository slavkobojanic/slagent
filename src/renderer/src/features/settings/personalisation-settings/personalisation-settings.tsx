import type { ComponentType, ReactNode } from "react"
import type { Personalisation, PersonalisationBranch, PersonalisationBrevity, PersonalisationCommit, PersonalisationCommitStrategy, PersonalisationExplanation, PersonalisationGitWorkflow, PersonalisationTone } from "@shared/types"
import { PINNED_FILE_CHAR_LIMIT, PINNED_TOTAL_CHAR_LIMIT } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChoiceSelect } from "./choice-select/choice-select"
import { choice, tri, triValue } from "./choice-select/choice-value"
import { Field } from "./field/field"

export type PersonalisationSettingsProps = {
  draft: Personalisation
  onPatch: (next: Partial<Personalisation>) => void
  onPickFiles: () => Promise<void>
  onRemoveFile: (name: string) => void
  SaveBar: ComponentType
}

export function PersonalisationSettings({ draft, onPatch, onPickFiles, onRemoveFile, SaveBar }: PersonalisationSettingsProps) {
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

        <Group title="How it talks" description="Tone, detail and language of every reply.">
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
          <Field label="Reply language">
            <Input
              value={draft.language ?? ""}
              placeholder="Auto — match your messages"
              onChange={(event) => onPatch({ language: event.target.value })}
            />
          </Field>
        </Group>

        <Group title="Git" description="Where work happens, and how branches and commits are named.">
          <Field label="Where it works">
            <ChoiceSelect
              value={draft.gitWorkflow}
              onValueChange={(gitWorkflow) => onPatch({ gitWorkflow: choice<PersonalisationGitWorkflow>(gitWorkflow) })}
              options={[
                { value: "main", label: "Prefer working on main" },
                { value: "branch", label: "Prefer working on a branch" },
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
        </Group>

        <Group title="When work is done" description="How the agent wraps up a turn.">
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
        </Group>

        <Group title="Extra instructions" description="Anything else the agent should always know.">
          <Field label="Anything else">
            <Textarea
              value={draft.notes ?? ""}
              rows={4}
              placeholder="Extra instructions for the agent — conventions, pet peeves, context it should always have…"
              onChange={(event) => onPatch({ notes: event.target.value })}
            />
          </Field>
          <PinnedFilesField draft={draft} onPickFiles={onPickFiles} onRemoveFile={onRemoveFile} />
        </Group>

        <SaveBar />
      </section>
    </div>
  )
}

function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-medium text-white/70">{title}</h3>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function PinnedFilesField({
  draft,
  onPickFiles,
  onRemoveFile,
}: {
  draft: Personalisation
  onPickFiles: () => Promise<void>
  onRemoveFile: (name: string) => void
}) {
  const files = draft.pinnedFiles ?? []
  const totalChars = files.reduce((sum, file) => sum + file.content.length, 0)
  const tokens = Math.round(totalChars / 4)

  return (
    <Field label="Pinned context files">
      <div className="space-y-2">
        <Textarea
          readOnly
          value={files.map((file) => `${file.name}\n${file.content}`).join("\n\n")}
          rows={5}
          className="max-h-40 overflow-y-auto font-mono text-xs"
          placeholder="No files pinned."
          aria-label="Pinned context files"
        />
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="xs" onClick={() => void onPickFiles()}>
            Add files…
          </Button>
          <span className="text-xs text-white/50">
            {totalChars.toLocaleString()} / {PINNED_TOTAL_CHAR_LIMIT.toLocaleString()} chars
            {tokens > 0 ? ` (~${tokens.toLocaleString()} tokens)` : ""} · max {PINNED_FILE_CHAR_LIMIT.toLocaleString()} per file
          </span>
        </div>
        {files.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {files.map((file) => (
              <span
                key={file.name}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-0.5 text-xs"
              >
                {file.name}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className="text-white/40 hover:text-white/90"
                  onClick={() => onRemoveFile(file.name)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-white/50">
          Appended to the agent&apos;s instructions in every request, so compaction never drops them.
        </p>
      </div>
    </Field>
  )
}
