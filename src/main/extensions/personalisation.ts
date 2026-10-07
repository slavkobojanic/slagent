import type { ExtensionFactory } from "@earendil-works/pi-coding-agent"
import type { Personalisation } from "../../shared/types"

// Global agent personalisation. The renderer composes the settings; this turns
// them into a system-prompt fragment that is appended on every run. Prefs are
// re-read per run, so edits apply from the very next message.

export function personalisationPrompt(p: Personalisation): string | null {
  const lines: string[] = []

  if (p.tone === "direct") lines.push("- Tone: direct. Get straight to the point. No filler, no hedging, no apologies.")
  if (p.tone === "friendly") lines.push("- Tone: friendly. Warm and conversational, but still technical and precise.")
  if (p.tone === "professional") lines.push("- Tone: professional. Neutral and businesslike; keep chat to a minimum.")

  if (p.brevity === "terse") lines.push("- Brevity: terse. One or two sentences unless more is genuinely needed. Prefer lists over prose.")
  if (p.brevity === "balanced") lines.push("- Brevity: balanced. Short replies; expand only when the detail earns its place.")
  if (p.brevity === "detailed") lines.push("- Brevity: detailed. Explain your reasoning and trade-offs as you go.")

  if (p.explanation === "minimal") lines.push("- Explanations: minimal. Just do the work; summarize what changed when done.")
  if (p.explanation === "normal") lines.push("- Explanations: normal. Briefly explain non-obvious choices.")
  if (p.explanation === "educational") lines.push("- Explanations: educational. Explain your choices as you go so the user learns from them.")

  if (p.branchNaming === "descriptive") {
    lines.push('- Git branches: name new branches in kebab-case describing the change (e.g. "fix-settings-persistence").')
  }
  if (p.branchNaming === "prefix") {
    const prefix = (p.branchPrefix ?? "").replace(/[^a-zA-Z0-9_-]/g, "")
    lines.push(
      prefix
        ? `- Git branches: start new branch names with "${prefix}/" followed by kebab-case describing the change (e.g. "${prefix}/fix-settings-persistence").`
        : '- Git branches: start new branch names with a short type prefix followed by "/" and kebab-case describing the change (e.g. "feat/add-personalisation").',
    )
  }

  if (p.commitStyle === "conventional") lines.push('- Git commits: use conventional commit messages ("type(scope): summary", e.g. "fix(settings): persist personalisation").')
  if (p.commitStyle === "imperative") lines.push('- Git commits: write imperative messages with a short summary line, e.g. "Persist personalisation in prefs".')
  if (p.commitStyle === "free") lines.push("- Git commits: the user picks the message; write a clear one-line summary and let them edit it.")

  if (p.emoji === true) lines.push("- Emoji: the user likes emoji. Use them sparingly, only where they aid scanning.")
  if (p.emoji === false) lines.push("- Emoji: never use emoji in replies, commit messages or code.")

  if (p.language) lines.push(`- Language: reply in ${p.language}, regardless of the language you would pick yourself.`)

  if (p.checkBeforeFinish === true) {
    lines.push(
      "- Before finishing: if the turn changed code, run the repo's typecheck and tests (when the repo has them) and fix anything you broke before ending the turn.",
    )
  }
  if (p.commitStrategy === "ask") {
    lines.push("- Committing: never commit or push without asking first, even when the user mentions commits or branches. Propose the change and wait for a yes.")
  }
  if (p.commitStrategy === "when-asked") {
    lines.push("- Committing: only commit or push when the user asks you to. Otherwise leave changes uncommitted.")
  }
  if (p.commitStrategy === "at-end") {
    lines.push(
      "- Committing: you don't need to ask. When the work is done and checks pass, commit it (and push if the branch tracks a remote) as one commit following the commit style above.",
    )
  }
  if (p.commitStrategy === "as-you-go") {
    lines.push(
      "- Committing: you don't need to ask. Commit small, focused chunks as you go (and push if the branch tracks a remote) instead of one big commit at the end. Each commit follows the commit style above.",
    )
  }

  const notes = (p.notes ?? "").trim()
  if (notes) lines.push(`- Extra instructions from the user (follow them; they override the above):\n${notes}`)

  if (lines.length === 0) return null
  return `[USER PERSONALISATION]\nHow this user wants you to work. These preferences apply to every reply, this one included.\n${lines.join("\n")}`
}

export function personalisationExtension(get: () => Personalisation): ExtensionFactory {
  return (pi) => {
    pi.on("before_agent_start", (event) => {
      const fragment = personalisationPrompt(get())
      if (!fragment) return
      // The result replaces the prompt for this turn, so keep everything the
      // session already has and append ours at the end.
      return { systemPrompt: `${event.systemPrompt}\n\n${fragment}` }
    })
  }
}
